import type { Petition, PetitionWithSource } from "@saitama-council-watch/shared-types";
import type { DocumentRepository } from "../../domain/document/DocumentRepository.js";

/**
 * 公開APIの表示用に、請願へ原本PDFの直リンク(sourceUrl)を付与する
 * (bills/attachSourceUrl.tsと同じ方針、docs/adr/0002)。
 */
export async function attachSourceUrlToPetitions(
  petitions: Petition[],
  documentRepository: DocumentRepository,
): Promise<PetitionWithSource[]> {
  return Promise.all(
    petitions.map(async (petition) => {
      const document = await documentRepository.findById(petition.sourceDocumentId);
      if (!document) {
        throw new Error(
          `Petition ${petition.id} の sourceDocumentId(${petition.sourceDocumentId}) に対応するDocumentが見つかりません`,
        );
      }
      return { ...petition, sourceUrl: document.sourceUrl };
    }),
  );
}
