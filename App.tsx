
import React, { useState, useRef, useCallback } from 'react';
import { editImageWithGemini } from './services/geminiService';
import { fileToBase64, getMimeType } from './utils/fileUtils';
import { UploadIcon, SparklesIcon, XCircleIcon, DownloadIcon } from './components/icons';
import { Spinner } from './components/Spinner';

type AppState = 'initial' | 'image_selected' | 'loading' | 'result' | 'error';

const App: React.FC = () => {
  const [sourceImageFiles, setSourceImageFiles] = useState<File[]>([]);
  const [sourceImageUrls, setSourceImageUrls] = useState<string[]>([]);
  const [prompt, setPrompt] = useState<string>('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>('initial');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const newImageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (newImageFiles.length === 0) return;

    const newImageUrls = newImageFiles.map(file => URL.createObjectURL(file));

    setSourceImageFiles(prev => [...prev, ...newImageFiles]);
    setSourceImageUrls(prev => [...prev, ...newImageUrls]);
    setGeneratedImageUrl(null);
    setError(null);
    setAppState('image_selected');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
    // Clear the input value to allow re-uploading the same file
    if(event.target) event.target.value = '';
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('border-indigo-400');
    handleFiles(event.dataTransfer.files);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.add('border-indigo-400');
  };
  
  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('border-indigo-400');
  };
  
  const handleRemoveImage = useCallback((indexToRemove: number) => {
    const newFiles = sourceImageFiles.filter((_, index) => index !== indexToRemove);
    const newUrls = sourceImageUrls.filter((_, index) => index !== indexToRemove);
    
    URL.revokeObjectURL(sourceImageUrls[indexToRemove]);

    setSourceImageFiles(newFiles);
    setSourceImageUrls(newUrls);

    if (newFiles.length === 0) {
        setAppState('initial');
    }
  }, [sourceImageFiles, sourceImageUrls]);

  const handleSubmit = useCallback(async () => {
    if (sourceImageFiles.length === 0 || !prompt) {
      setError('Please select at least one image and enter a prompt.');
      setAppState('error');
      return;
    }

    setAppState('loading');
    setError(null);
    setGeneratedImageUrl(null);

    try {
      const imageDatas = await Promise.all(
        sourceImageFiles.map(async (file) => {
          const base64Data = await fileToBase64(file);
          const mimeType = getMimeType(file.name) || file.type;
          if (!mimeType) {
            throw new Error(`Could not determine image MIME type for ${file.name}.`);
          }
          return { data: base64Data, mimeType };
        })
      );
      
      const resultBase64 = await editImageWithGemini(prompt, imageDatas);
      
      const resultImageUrl = `data:image/png;base64,${resultBase64}`;
      setGeneratedImageUrl(resultImageUrl);
      setAppState('result');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setAppState('error');
    }
  }, [sourceImageFiles, prompt]);

  const clearState = () => {
    sourceImageUrls.forEach(url => URL.revokeObjectURL(url));
    setSourceImageFiles([]);
    setSourceImageUrls([]);
    setGeneratedImageUrl(null);
    setError(null);
    setPrompt('');
    setAppState('initial');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownload = () => {
    if (!generatedImageUrl) return;
    const link = document.createElement('a');
    link.href = generatedImageUrl;
    link.download = `gemini-fusion-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-7xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
            Gemini Image Fusion
          </h1>
          <p className="mt-2 text-lg text-gray-400">
            Create amazing new photos of you and your friends! Upload their photos, describe a scene, and let AI do the rest.
          </p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Control Panel */}
          <div className="bg-gray-800/50 p-6 rounded-2xl shadow-lg flex flex-col space-y-6 backdrop-blur-sm border border-gray-700">
            <div>
              <label className="text-lg font-semibold text-gray-300 mb-2 block">1. Upload Photos</label>
              <div
                className="relative border-2 border-dashed border-gray-600 rounded-lg text-center cursor-pointer hover:border-indigo-500 transition-colors duration-300 min-h-[16rem] flex flex-col justify-center"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  multiple
                />
                {sourceImageUrls.length > 0 ? (
                  <div className="p-4 h-full max-h-80 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {sourceImageUrls.map((url, index) => (
                      <div key={`${url}-${index}`} className="relative group aspect-square">
                        <img src={url} alt={`Uploaded preview ${index + 1}`} className="w-full h-full object-cover rounded-md"/>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveImage(index); }}
                          className="absolute top-1 right-1 bg-black/60 p-0.5 rounded-full text-white opacity-0 group-hover:opacity-100 hover:bg-black/80 transition-all duration-200"
                          aria-label="Remove image"
                        >
                          <XCircleIcon className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center justify-center border-2 border-dashed border-gray-700 rounded-md text-gray-500 hover:text-gray-400 hover:border-gray-500 transition-colors aspect-square">
                      <div className="text-center">
                          <UploadIcon className="w-8 h-8 mx-auto"/>
                          <p className="text-xs mt-1 font-semibold">Add more</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-2 text-gray-400">
                    <UploadIcon className="w-12 h-12" />
                    <p className="font-semibold">Click to upload or drag & drop</p>
                    <p className="text-sm">Upload one or more photos of people</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="prompt" className="text-lg font-semibold text-gray-300 mb-2 block">2. Describe The Scene</label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., 'a group photo on a beach at sunset', 'draw them as superheroes', 'place them in a sci-fi movie scene'"
                className="w-full h-32 p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors placeholder-gray-500"
                disabled={appState === 'loading' || sourceImageFiles.length === 0}
              />
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={appState === 'loading' || sourceImageFiles.length === 0 || !prompt}
              className="w-full flex items-center justify-center py-3 px-6 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 text-lg shadow-lg hover:shadow-indigo-500/50 transform hover:scale-105 disabled:transform-none"
            >
              {appState === 'loading' ? <Spinner /> : <SparklesIcon className="w-6 h-6 mr-2" />}
              Generate
            </button>
          </div>

          {/* Result Panel */}
          <div className="bg-gray-800/50 p-6 rounded-2xl shadow-lg flex items-center justify-center backdrop-blur-sm border border-gray-700 min-h-[400px] lg:min-h-0">
            {appState === 'loading' && (
              <div className="text-center">
                <Spinner size="lg" />
                <p className="mt-4 text-lg text-gray-400 animate-pulse">Gemini is creating your image...</p>
              </div>
            )}
            {appState === 'error' && error && (
              <div className="text-center text-red-400">
                <XCircleIcon className="w-16 h-16 mx-auto mb-4" />
                <p className="font-bold">An Error Occurred</p>
                <p className="text-sm mt-2">{error}</p>
                 <button onClick={clearState} className="mt-4 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/40">Try Again</button>
              </div>
            )}
            {appState === 'result' && generatedImageUrl && (
              <div className="w-full h-full flex flex-col gap-4">
                <div className="flex-grow relative min-h-0">
                  <img src={generatedImageUrl} alt="Generated result" className="rounded-lg object-contain w-full h-full"/>
                </div>
                <div className="flex-shrink-0 flex items-center justify-center gap-4">
                  <button
                    onClick={handleDownload}
                    className="flex items-center justify-center py-2 px-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors duration-300"
                  >
                    <DownloadIcon className="w-5 h-5 mr-2" />
                    Download
                  </button>
                  <button
                    onClick={clearState}
                    className="flex items-center justify-center py-2 px-4 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition-colors duration-300"
                  >
                    <XCircleIcon className="w-5 h-5 mr-2" />
                    Start Over
                  </button>
                </div>
              </div>
            )}
            {(appState === 'initial' || appState === 'image_selected') && !generatedImageUrl && (
              <div className="text-center text-gray-500">
                <SparklesIcon className="w-16 h-16 mx-auto mb-4" />
                <p className="font-semibold">Your generated image will appear here</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
