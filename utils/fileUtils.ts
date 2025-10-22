
/**
 * Converts a File object to a base64 encoded string, stripping the data URL prefix.
 * @param file The File object to convert.
 * @returns A promise that resolves with the base64 string.
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // result is "data:image/jpeg;base64,LzlqLzRBQ...". We only want the part after the comma.
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      } else {
        reject(new Error('Failed to read file as a data URL.'));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

/**
 * Attempts to determine the MIME type from a file extension.
 * @param filename The name of the file.
 * @returns The MIME type string or null if not determined.
 */
export const getMimeType = (filename: string): string | null => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'jpg':
        case 'jpeg':
            return 'image/jpeg';
        case 'png':
            return 'image/png';
        case 'webp':
            return 'image/webp';
        default:
            return null;
    }
}
