import browser from "webextension-polyfill";

export async function getStorageItem<T>(key: string): Promise<T | undefined> {
  const result = await browser.storage.local.get(key);
  return result[key] as T | undefined;
}

export async function setStorageItem<T>(key: string, value: T): Promise<void> {
  await browser.storage.local.set({ [key]: value });
}

export async function removeStorageItem(key: string | string[]): Promise<void> {
  await browser.storage.local.remove(key);
}
