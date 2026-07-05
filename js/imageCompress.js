// imageCompress.js
// アップロード直前に画像を圧縮する（1章の仕様: 長辺800px, 画質70%）
// 元画像が数MB〜十数MBあっても、50〜100KB程度まで軽量化する

const MAX_EDGE = 800;
const QUALITY = 0.7;

/**
 * 画像ファイルを圧縮してBlobを返す
 * @param {File} file - input[type=file]から取得したファイル
 * @returns {Promise<Blob>} 圧縮後のJPEG Blob
 */
export function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        const { width, height } = calculateTargetSize(img.width, img.height);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("画像の圧縮に失敗しました"));
          },
          "image/jpeg",
          QUALITY
        );
      };
      img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"));
    reader.readAsDataURL(file);
  });
}

// 長辺がMAX_EDGEを超える場合、アスペクト比を保って縮小する
function calculateTargetSize(width, height) {
  if (width <= MAX_EDGE && height <= MAX_EDGE) {
    return { width, height };
  }
  if (width > height) {
    return { width: MAX_EDGE, height: Math.round((height / width) * MAX_EDGE) };
  }
  return { width: Math.round((width / height) * MAX_EDGE), height: MAX_EDGE };
}