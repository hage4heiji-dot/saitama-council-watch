import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import { politePostForm } from "./httpClient.js";
import { assertAllowedByRobotsTxt } from "./robotsCheck.js";

/**
 * さいたま市議会資料検索システム(Discuss Cabinet)のスクレイパー基盤(docs/adr/0016)。
 *
 * このシステムはリンクではなくセッション状態を伴うフォームPOST(POST /saitama/list 等)で
 * 遷移するJS駆動のUIであり、通常のGETクロールが通用しない。
 * 各レスポンスに含まれる hidden input を全て抽出し、次のリクエストにそのまま引き継いだ上で
 * 遷移に必要な項目(folder_id, move, docid, fileid等)だけを上書きする方法のみが機能する
 * (一部のhidden fieldだけを手動で組み立てるとサーバー側で「エラー画面」になることを確認済み)。
 *
 * ゲストアクセス(userid/password は空のhidden fieldで、実際のログインは不要)であることを
 * 実サイトで確認済み。
 */

const ORIGIN = "https://www.discusscabinet.net";
const BASE_PATH = "/saitama";

export interface DiscussCabinetFolder {
  title: string;
  folderId: string;
}

export interface DiscussCabinetDocumentRow {
  docid: string;
  title: string;
  date: string;
}

// 「setFolderid('224514','down')」「setCabinetid('1')」からIDを取り出す
const FOLDER_ID_PATTERN = /set(?:Folderid|Cabinetid)\('?(?<id>\d+)'?/;
const FILE_ID_PATTERN = /setFile\('(?<id>\d+)'\)/;

export class DiscussCabinetSession {
  private cookie: string | null = null;
  private hiddenFields: Record<string, string> = {};
  private $current: CheerioAPI | null = null;

  private extractHiddenFields($: CheerioAPI): Record<string, string> {
    const fields: Record<string, string> = {};
    $("input[type=hidden]").each((_, element) => {
      const name = $(element).attr("name");
      if (name) {
        fields[name] = $(element).attr("value") ?? "";
      }
    });
    return fields;
  }

  /**
   * /saitama/{path} へのPOST。直前のレスポンスのhidden fieldを全て引き継ぎ、overridesで上書きする。
   * 初回呼び出し時はoverridesのみを送る(まだ引き継ぐhidden fieldが存在しないため)。
   */
  async post(path: string, overrides: Record<string, string>): Promise<CheerioAPI> {
    await assertAllowedByRobotsTxt(ORIGIN, BASE_PATH);

    const fields = { ...this.hiddenFields, ...overrides };
    const result = await politePostForm(`${ORIGIN}${BASE_PATH}/${path}`, fields, this.cookie);
    if (result.setCookie) {
      this.cookie = result.setCookie;
    }

    const html = result.buffer.toString("utf-8");
    const $ = cheerio.load(html);
    if ($("title").text().includes("エラー画面")) {
      throw new Error(
        `資料検索システムがエラー画面を返しました(path=${path})。hidden fieldの引き継ぎ漏れの可能性があります。`,
      );
    }

    this.hiddenFields = this.extractHiddenFields($);
    this.$current = $;
    return $;
  }

  current(): CheerioAPI {
    if (!this.$current) {
      throw new Error("まだページを取得していません");
    }
    return this.$current;
  }

  /** ゲストアクセスでキャビネット一覧画面に入る */
  async enterGuest(): Promise<CheerioAPI> {
    return this.post("list", { userid: "", password: "", actions: "" });
  }

  /** キャビネット(本会議=1、委員会=2等)を選択する */
  async selectCabinet(cabinetId: string): Promise<CheerioAPI> {
    return this.post("list", { cabinet_id: cabinetId, folder_id: "0", move: "", actions: "" });
  }

  /** 子フォルダへ入る */
  async enterFolder(folderId: string): Promise<CheerioAPI> {
    return this.post("list", { folder_id: folderId, move: "down", actions: "" });
  }

  /** 現在のフォルダから親フォルダへ戻る */
  async exitFolder(currentFolderId: string): Promise<CheerioAPI> {
    return this.post("list", { folder_id: currentFolderId, move: "up", actions: "" });
  }

  /** 現在のフォルダ一覧画面から、指定タイトルのサブフォルダIDを取得する */
  findFolderByTitle(title: string): string | null {
    const $ = this.current();
    let found: string | null = null;
    $("button[onclick*='setFolderid']").each((_, element) => {
      if (found) {
        return;
      }
      const buttonTitle = $(element).attr("title")?.trim();
      const onclick = $(element).attr("onclick") ?? "";
      const match = FOLDER_ID_PATTERN.exec(onclick);
      if (buttonTitle === title && match?.groups?.id) {
        found = match.groups.id;
      }
    });
    return found;
  }

  /** 現在のフォルダ一覧画面にある全サブフォルダを列挙する(未知の日付フォルダ探索用) */
  listSubfolders(): DiscussCabinetFolder[] {
    const $ = this.current();
    const folders: DiscussCabinetFolder[] = [];
    $("button[onclick*='setFolderid']").each((_, element) => {
      const title = $(element).attr("title")?.trim();
      const onclick = $(element).attr("onclick") ?? "";
      const match = FOLDER_ID_PATTERN.exec(onclick);
      if (title && match?.groups?.id) {
        folders.push({ title, folderId: match.groups.id });
      }
    });
    return folders;
  }

  /** 現在のフォルダ一覧画面にある文書行(件名・日付・docid)を列挙する */
  listDocuments(): DiscussCabinetDocumentRow[] {
    const $ = this.current();
    const rows: DiscussCabinetDocumentRow[] = [];
    $("table#table9_2 tr").each((_, tr) => {
      const button = $(tr).find("button[onclick*='doSubmitWithDocid']").first();
      const onclick = button.attr("onclick") ?? "";
      const docidMatch = /doSubmitWithDocid\('doc_view',\s*(?<id>\d+)\)/.exec(onclick);
      if (!docidMatch?.groups?.id) {
        return;
      }
      const cells = $(tr).find("td");
      // 列構成: [img, clip, 件名, 日付]
      const title = cells.eq(2).text().trim();
      const date = cells.eq(3).text().trim();
      rows.push({ docid: docidMatch.groups.id, title, date });
    });
    return rows;
  }

  /** 文書詳細画面に入り、添付ファイルのfileIdを取得する */
  async viewDocument(docid: string): Promise<string | null> {
    const $ = await this.post("doc_view", { docid, actions: "doc_view" });
    const html = $.html();
    const match = FILE_ID_PATTERN.exec(html);
    return match?.groups?.id ?? null;
  }

  /** viewDocument直後の状態から、添付ファイル(PDF等)の実体をダウンロードする */
  async downloadFile(fileId: string): Promise<Buffer> {
    await assertAllowedByRobotsTxt(ORIGIN, BASE_PATH);
    const fields = { ...this.hiddenFields, fileid: fileId };
    const result = await politePostForm(`${ORIGIN}${BASE_PATH}/file_view`, fields, this.cookie);
    if (result.setCookie) {
      this.cookie = result.setCookie;
    }
    return result.buffer;
  }
}
