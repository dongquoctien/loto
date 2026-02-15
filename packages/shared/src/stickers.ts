/**
 * Sticker data for chat
 * Using animated GIFs from GitHub
 */

export interface Sticker {
  id: string;
  url: string;
  category: 'working' | 'emotion' | 'action';
  name?: string;
}

/**
 * Placeholder sticker for when a sticker is not found (deleted/inactive)
 */
export const PLACEHOLDER_STICKER: Sticker = {
  id: 'placeholder',
  url: '/assets/sticker-unavailable.jpg',
  category: 'emotion',
  name: 'Không khả dụng',
};

export const STICKERS: Sticker[] = [
  // Working stickers - Row 1
  { id: 'work_01', url: 'https://user-images.githubusercontent.com/74038190/216649417-9acc58df-9186-4132-ad43-819a57babb67.gif', category: 'working' },
  { id: 'work_02', url: 'https://user-images.githubusercontent.com/74038190/216649421-9e9387cc-b2d3-4375-97e2-f4c43373d3ae.gif', category: 'working' },
  { id: 'work_03', url: 'https://user-images.githubusercontent.com/74038190/216649426-0c2ee152-84d8-4707-85c4-27a378d2f78a.gif', category: 'working' },
  { id: 'work_04', url: 'https://user-images.githubusercontent.com/74038190/216649430-0a912dae-e61b-45cf-8f65-895bd6444f3a.gif', category: 'working' },
  { id: 'work_05', url: 'https://user-images.githubusercontent.com/74038190/216649436-05c6a71a-0566-45aa-bc3f-f258ab12e491.gif', category: 'working' },
  { id: 'work_06', url: 'https://user-images.githubusercontent.com/74038190/216649441-c7a4d602-5d9b-4c5b-99d4-697bddf6f8e0.gif', category: 'working' },
  { id: 'work_07', url: 'https://user-images.githubusercontent.com/74038190/216649443-702212b5-2704-4b2c-8ab0-38bf536a0d41.gif', category: 'working' },
  { id: 'work_08', url: 'https://user-images.githubusercontent.com/74038190/216649449-3f087222-10d7-4132-b128-0bb0830cdb9a.gif', category: 'working' },
  { id: 'work_09', url: 'https://user-images.githubusercontent.com/74038190/216649450-e63af5d5-a769-4e9f-8bd1-c2b9005dc53c.gif', category: 'working' },
  { id: 'work_10', url: 'https://user-images.githubusercontent.com/74038190/216653728-5f452bd4-f1b8-401e-a337-f6fbae9d493a.gif', category: 'working' },

  // Emotion stickers - Row 2-3
  { id: 'emotion_01', url: 'https://user-images.githubusercontent.com/74038190/216654095-6f6772e4-e433-4bba-9164-1ca6f463ac3f.gif', category: 'emotion' },
  { id: 'emotion_02', url: 'https://user-images.githubusercontent.com/74038190/216654106-c24cc9c0-d319-404e-9bbc-402639637bd9.gif', category: 'emotion' },
  { id: 'emotion_03', url: 'https://user-images.githubusercontent.com/74038190/216654112-f34391b7-72e0-4053-8849-30dcaeaa1aaa.gif', category: 'emotion' },
  { id: 'emotion_04', url: 'https://user-images.githubusercontent.com/74038190/216654116-d0e8d227-7977-4edc-8d36-63461bda9503.gif', category: 'emotion' },
  { id: 'emotion_05', url: 'https://user-images.githubusercontent.com/74038190/216654124-2433fb55-4955-421e-9191-9cad876f08cf.gif', category: 'emotion' },
  { id: 'emotion_06', url: 'https://user-images.githubusercontent.com/74038190/216654128-ad1c5827-e18e-43a6-974b-3669cbb082b9.gif', category: 'emotion' },
  { id: 'emotion_07', url: 'https://user-images.githubusercontent.com/74038190/216654136-2b97900b-59ee-45c5-87bb-0c359e31dd2f.gif', category: 'emotion' },
  { id: 'emotion_08', url: 'https://user-images.githubusercontent.com/74038190/216654141-4aa6ba4c-aa36-481a-bb65-56ee85d87de3.gif', category: 'emotion' },
  { id: 'emotion_09', url: 'https://user-images.githubusercontent.com/74038190/216655797-63671069-cb49-4ce1-a2d0-f15d1f4be193.gif', category: 'emotion' },
  { id: 'emotion_10', url: 'https://user-images.githubusercontent.com/74038190/216655805-c5868f80-8764-40d1-b99e-aa424dac6536.gif', category: 'emotion' },
  { id: 'emotion_11', url: 'https://user-images.githubusercontent.com/74038190/216655810-e2e89b30-25a2-479a-a20f-c4bde3634607.gif', category: 'emotion' },
  { id: 'emotion_12', url: 'https://user-images.githubusercontent.com/74038190/216655818-2e7b9a31-49bf-4744-85a8-db8a2577c45c.gif', category: 'emotion' },
  { id: 'emotion_13', url: 'https://user-images.githubusercontent.com/74038190/216655813-c9147cb2-cfee-4955-b591-52cac08f1f60.gif', category: 'emotion' },
  { id: 'emotion_14', url: 'https://user-images.githubusercontent.com/74038190/216655825-c639587f-6eb0-4841-b622-9f522f55d40e.gif', category: 'emotion' },
  { id: 'emotion_15', url: 'https://user-images.githubusercontent.com/74038190/216655827-a410d92c-88f7-4639-bf0a-6f0a36134591.gif', category: 'emotion' },
  { id: 'emotion_16', url: 'https://user-images.githubusercontent.com/74038190/216655832-f5fe3f6c-6581-4c2d-8203-04d31a574c02.gif', category: 'emotion' },
  { id: 'emotion_17', url: 'https://user-images.githubusercontent.com/74038190/216655835-a5f1d93e-f8b1-44da-90ec-e52e833824f6.gif', category: 'emotion' },
  { id: 'emotion_18', url: 'https://user-images.githubusercontent.com/74038190/216655840-d7262fea-0313-4161-9c45-f69077ea6a2f.gif', category: 'emotion' },
  { id: 'emotion_19', url: 'https://user-images.githubusercontent.com/74038190/216655846-93807a43-d6e8-448a-bf19-799b5e8c1c0a.gif', category: 'emotion' },
  { id: 'emotion_20', url: 'https://user-images.githubusercontent.com/74038190/216655848-cf4d7bed-52aa-4740-8c67-1832472051ec.gif', category: 'emotion' },

  // Action stickers - Row 4-6
  { id: 'action_01', url: 'https://user-images.githubusercontent.com/74038190/216655851-0415f042-4ad3-4c66-b63d-ab57210929fd.gif', category: 'action' },
  { id: 'action_02', url: 'https://user-images.githubusercontent.com/74038190/216655853-3acb8c9c-42bd-4d0c-aaa6-27b409361578.gif', category: 'action' },
  { id: 'action_03', url: 'https://user-images.githubusercontent.com/74038190/216655855-e00c1861-e964-4b4f-90ae-2592cad7b272.gif', category: 'action' },
  { id: 'action_04', url: 'https://user-images.githubusercontent.com/74038190/216655859-f66df97b-6767-4ab2-b6f4-a9cba3ff3591.gif', category: 'action' },
  { id: 'action_05', url: 'https://user-images.githubusercontent.com/74038190/216656934-0dd55b98-a77e-4d26-8865-9147906e0f99.gif', category: 'action' },
  { id: 'action_06', url: 'https://user-images.githubusercontent.com/74038190/216656944-f8c1b44e-493b-487f-87be-6cfe6a1a3374.gif', category: 'action' },
  { id: 'action_07', url: 'https://user-images.githubusercontent.com/74038190/216656947-44e5d67b-e907-4646-99da-6a4b4f52ef81.gif', category: 'action' },
  { id: 'action_08', url: 'https://user-images.githubusercontent.com/74038190/216656949-4d98aa51-a60a-4dd1-b531-1b5745e18002.gif', category: 'action' },
  { id: 'action_09', url: 'https://user-images.githubusercontent.com/74038190/216656950-4ecec37b-f42b-4bd8-8cd5-55fecbe04df6.gif', category: 'action' },
  { id: 'action_10', url: 'https://user-images.githubusercontent.com/74038190/216656952-f8beff5b-935b-4157-a199-5c504b36a810.gif', category: 'action' },
  { id: 'action_11', url: 'https://user-images.githubusercontent.com/74038190/216656956-c5f97119-4de0-4e55-8906-c2699cc43ccd.gif', category: 'action' },
  { id: 'action_12', url: 'https://user-images.githubusercontent.com/74038190/216656959-bdd9b5f2-9fc8-438e-bbf3-3674c39ec746.gif', category: 'action' },
  { id: 'action_13', url: 'https://user-images.githubusercontent.com/74038190/216656963-09118229-8a9e-4af0-910c-c37f35f2e210.gif', category: 'action' },
  { id: 'action_14', url: 'https://user-images.githubusercontent.com/74038190/216656967-625b2a52-e638-4c21-a8ae-180560386f96.gif', category: 'action' },
  { id: 'action_15', url: 'https://user-images.githubusercontent.com/74038190/216656971-9a208a88-e6ad-4b7a-88eb-c410e4cf0e00.gif', category: 'action' },
  { id: 'action_16', url: 'https://user-images.githubusercontent.com/74038190/216656977-ef584e23-480a-4d1c-8c3f-7d045910ddc9.gif', category: 'action' },
  { id: 'action_17', url: 'https://user-images.githubusercontent.com/74038190/216656982-82fce1e6-72ff-48aa-bbcd-5270671adeaa.gif', category: 'action' },
  { id: 'action_18', url: 'https://user-images.githubusercontent.com/74038190/216656986-e4424d73-56dd-4e0d-96ac-66f9f2c3be42.gif', category: 'action' },
  { id: 'action_19', url: 'https://user-images.githubusercontent.com/74038190/216656987-9b3a52af-79d3-418c-8789-579955588e68.gif', category: 'action' },
  { id: 'action_20', url: 'https://user-images.githubusercontent.com/74038190/216656996-3949e8a6-24c0-4bdb-a78d-6b348bde0fcb.gif', category: 'action' },
  { id: 'action_21', url: 'https://user-images.githubusercontent.com/74038190/216656993-2f7ade25-348a-4925-95a8-fba437ed9bcd.gif', category: 'action' },
  { id: 'action_22', url: 'https://user-images.githubusercontent.com/74038190/216656999-c53f8286-1ed5-4dc0-9c4d-165b9dd4a89d.gif', category: 'action' },
  { id: 'action_23', url: 'https://user-images.githubusercontent.com/74038190/216658113-c947be31-78e5-4064-9cb5-7d23b49164e6.gif', category: 'action' },
  { id: 'action_24', url: 'https://user-images.githubusercontent.com/74038190/216658115-017b0125-1bba-409d-b789-c04362c0adfb.gif', category: 'action' },
  { id: 'action_25', url: 'https://user-images.githubusercontent.com/74038190/216658117-5a5c9ab7-7319-4ffa-9e64-79d6bf0fb8d1.gif', category: 'action' },
  { id: 'action_26', url: 'https://user-images.githubusercontent.com/74038190/216658123-b1fdfa47-8605-467a-ab8b-0e87a7916002.gif', category: 'action' },
  { id: 'action_27', url: 'https://user-images.githubusercontent.com/74038190/216658127-de9ffd2f-9302-45f3-82f5-1fa66dafa691.gif', category: 'action' },
  { id: 'action_28', url: 'https://user-images.githubusercontent.com/74038190/216658130-13d4140b-b57b-47b6-a19a-5547b42b47f6.gif', category: 'action' },
  { id: 'action_29', url: 'https://user-images.githubusercontent.com/74038190/216658099-d7c8efef-4e2f-4cdb-8d4d-977a02bee0bc.gif', category: 'action' },
  { id: 'action_30', url: 'https://user-images.githubusercontent.com/74038190/216658104-661d7d68-0492-49c5-92f9-6f657f10cbc7.gif', category: 'action' },

  // Extra cute stickers
  { id: 'cute_01', url: 'https://github.com/Anmol-Baranwal/Cool-GIFs-For-GitHub/assets/74038190/79258361-c121-400c-8245-600b272b1eea', category: 'emotion' },
  { id: 'cute_02', url: 'https://github.com/Anmol-Baranwal/Cool-GIFs-For-GitHub/assets/74038190/b206f421-052b-4444-bcdb-48c41c85c18b', category: 'emotion' },
  { id: 'cute_03', url: 'https://github.com/Anmol-Baranwal/Cool-GIFs-For-GitHub/assets/74038190/53fc5e35-28f2-4663-913c-d9a255c0918d', category: 'emotion' },
  { id: 'cute_04', url: 'https://github.com/Anmol-Baranwal/Cool-GIFs-For-GitHub/assets/74038190/6e08afa6-3618-4c9e-8c1c-0ed8f4262bd3', category: 'emotion' },
  { id: 'cute_05', url: 'https://github.com/Anmol-Baranwal/Cool-GIFs-For-GitHub/assets/74038190/33983d9b-6614-4eb9-8185-408092eac0a0', category: 'emotion' },
  { id: 'cute_06', url: 'https://github.com/Anmol-Baranwal/Cool-GIFs-For-GitHub/assets/74038190/5a0ca158-4df4-4e05-b510-a37b228d4f08', category: 'emotion' },
  { id: 'cute_07', url: 'https://github.com/Anmol-Baranwal/Cool-GIFs-For-GitHub/assets/74038190/2e0e9fbd-96f5-4ddb-b198-911c8f3d1ef1', category: 'emotion' },
  { id: 'cute_08', url: 'https://github.com/Anmol-Baranwal/Cool-GIFs-For-GitHub/assets/74038190/9ffcea75-ad3b-4ff9-b8b0-1ee4661ad4a7', category: 'emotion' },
  { id: 'cute_09', url: 'https://github.com/Anmol-Baranwal/Cool-GIFs-For-GitHub/assets/74038190/a28188da-2b7d-4d24-9381-2ce9b274d379', category: 'emotion' },
  { id: 'cute_10', url: 'https://github.com/Anmol-Baranwal/Cool-GIFs-For-GitHub/assets/74038190/02d5a390-b263-43a4-981c-fbdc18c8b902', category: 'emotion' },
];

/** Get sticker by ID - returns undefined if not found */
export function getStickerById(id: string): Sticker | undefined {
  return STICKERS.find(s => s.id === id);
}

/** Get sticker by ID with placeholder fallback */
export function getStickerByIdOrPlaceholder(id: string): Sticker {
  return STICKERS.find(s => s.id === id) || PLACEHOLDER_STICKER;
}

/** Get stickers by category */
export function getStickersByCategory(category: Sticker['category']): Sticker[] {
  return STICKERS.filter(s => s.category === category);
}

/** Sticker categories for UI */
export const STICKER_CATEGORIES = [
  { id: 'working', label: 'Cute', icon: '💼' },
  { id: 'emotion', label: 'Cảm xúc', icon: '😊' },
  { id: 'action', label: 'Hành động', icon: '🎬' },
] as const;
