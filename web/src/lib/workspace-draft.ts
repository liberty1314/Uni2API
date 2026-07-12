import localforage from "localforage";

import type { StoredReferenceImage } from "@/store/image-conversations";

export type WorkspaceQuickCreateDraft = {
  id: string;
  prompt: string;
  model: string;
  ratio: string;
  quality: string;
  count: string;
  referenceImages: StoredReferenceImage[];
  createdAt: string;
};

const draftStorage = localforage.createInstance({
  name: "uni2api",
  storeName: "workspace-quick-create",
});

export async function saveWorkspaceQuickCreateDraft(
  draft: Omit<WorkspaceQuickCreateDraft, "id" | "createdAt">,
) {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const nextDraft: WorkspaceQuickCreateDraft = {
    ...draft,
    id,
    createdAt: new Date().toISOString(),
  };
  await draftStorage.setItem(id, nextDraft);
  return id;
}

export async function consumeWorkspaceQuickCreateDraft(id: string) {
  const draft = await draftStorage.getItem<WorkspaceQuickCreateDraft>(id);
  if (draft) {
    await draftStorage.removeItem(id);
  }
  return draft;
}
