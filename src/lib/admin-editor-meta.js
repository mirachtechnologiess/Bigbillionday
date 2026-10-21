import "server-only";
import { db } from "./db";
import { getSettings } from "./settings";
import { aiEnabled } from "./ai";

/** Lookups the product editor needs (brands, categories, collections, store name, AI status). */
export async function editorMeta() {
  const [brands, categories, collections, settings] = await Promise.all([
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, parentId: true } }),
    db.collection.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    getSettings(),
  ]);
  return { meta: { brands, categories, collections }, storeName: settings.store.name, aiOn: await aiEnabled() };
}
