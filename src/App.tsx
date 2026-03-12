import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  MapPin, 
  Plus, 
  Sparkles, 
  Calendar, 
  Image as ImageIcon, 
  Send, 
  Loader2, 
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Info,
  Languages
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Markdown from 'react-markdown';
import { 
  analyzeBusiness, 
  generatePostIdeas, 
  generateFullPost, 
  generateImage,
  PostIdea 
} from './services/gemini';
import { translations, Language } from './translations';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function App() {
  const [lang, setLang] = useState<Language>('pl');
  const t = translations[lang];

  const [websiteUrl, setWebsiteUrl] = useState('');
  const [gbpUrl, setGbpUrl] = useState('');
  const [extraInfo, setExtraInfo] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [ideas, setIdeas] = useState<PostIdea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<PostIdea | null>(null);
  const [postContents, setPostContents] = useState<Record<string, { text: string; imageUrl?: string; loading: boolean; imageLoading: boolean }>>({});
  const [imageSize, setImageSize] = useState<"1K" | "2K" | "4K">("1K");
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!websiteUrl) return;

    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeBusiness(websiteUrl, gbpUrl, extraInfo, lang);
      setAnalysis(result);
      const postIdeas = await generatePostIdeas(result, lang);
      setIdeas(postIdeas);
    } catch (err: any) {
      console.error(err);
      setError(t.errorAnalysis);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateContent = async (idea: PostIdea) => {
    setPostContents(prev => ({
      ...prev,
      [idea.id]: { ...prev[idea.id], text: '', loading: true, imageLoading: false }
    }));

    try {
      const content = await generateFullPost(idea, analysis, lang);
      setPostContents(prev => ({
        ...prev,
        [idea.id]: { ...prev[idea.id], text: content, loading: false }
      }));
    } catch (err) {
      console.error(err);
      setPostContents(prev => ({
        ...prev,
        [idea.id]: { ...prev[idea.id], loading: false }
      }));
    }
  };

  const handleGenerateImage = async (idea: PostIdea) => {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await window.aistudio.openSelectKey();
    }

    setPostContents(prev => ({
      ...prev,
      [idea.id]: { ...prev[idea.id], imageLoading: true }
    }));

    try {
      const imageUrl = await generateImage(idea.title, imageSize);
      if (imageUrl) {
        setPostContents(prev => ({
          ...prev,
          [idea.id]: { ...prev[idea.id], imageUrl, imageLoading: false }
        }));
      } else {
        throw new Error("No image generated");
      }
    } catch (err) {
      console.error(err);
      setPostContents(prev => ({
        ...prev,
        [idea.id]: { ...prev[idea.id], imageLoading: false }
      }));
      setError(t.errorImage);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#1A1A1A] font-sans selection:bg-[#5A5A40] selection:text-white">
      {/* Header */}
      <header className="border-b border-black/10 bg-white/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#5A5A40] rounded-lg flex items-center justify-center">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <h1 className="font-serif italic text-xl font-medium tracking-tight">{t.appName}</h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-black/5 p-1 rounded-lg">
              <button 
                onClick={() => setLang('pl')}
                className={cn("px-2 py-1 text-[10px] font-bold rounded transition-all", lang === 'pl' ? "bg-white shadow-sm text-[#5A5A40]" : "opacity-40 hover:opacity-100")}
              >
                PL
              </button>
              <button 
                onClick={() => setLang('en')}
                className={cn("px-2 py-1 text-[10px] font-bold rounded transition-all", lang === 'en' ? "bg-white shadow-sm text-[#5A5A40]" : "opacity-40 hover:opacity-100")}
              >
                EN
              </button>
            </div>
            <div className="hidden sm:block text-xs uppercase tracking-widest font-semibold opacity-50">
              {t.appSubtitle}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-[400px_1fr] gap-12">
          
          {/* Left Column: Input Form */}
          <section className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-serif font-light leading-tight">{t.defineBrand}</h2>
              <p className="text-sm text-[#5A5A40]/70">{t.brandSubtitle}</p>
            </div>

            <form onSubmit={handleAnalyze} className="space-y-6">
              <div className="space-y-4">
                <div className="group">
                  <label className="text-[10px] uppercase tracking-wider font-bold mb-1.5 block opacity-50 group-focus-within:opacity-100 transition-opacity">{t.websiteUrl}</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                    <input 
                      type="url" 
                      required
                      placeholder="https://yourbusiness.com"
                      className="w-full bg-white border border-black/5 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] transition-all"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="text-[10px] uppercase tracking-wider font-bold mb-1.5 block opacity-50 group-focus-within:opacity-100 transition-opacity">{t.gbpUrl}</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                    <input 
                      type="url" 
                      placeholder="https://maps.google.com/..."
                      className="w-full bg-white border border-black/5 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] transition-all"
                      value={gbpUrl}
                      onChange={(e) => setGbpUrl(e.target.value)}
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="text-[10px] uppercase tracking-wider font-bold mb-1.5 block opacity-50 group-focus-within:opacity-100 transition-opacity">{t.extraInfo}</label>
                  <textarea 
                    placeholder={t.extraInfoPlaceholder}
                    className="w-full bg-white border border-black/5 rounded-xl py-3 px-4 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] transition-all resize-none"
                    value={extraInfo}
                    onChange={(e) => setExtraInfo(e.target.value)}
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isAnalyzing}
                className="w-full bg-[#5A5A40] text-white rounded-xl py-4 font-medium flex items-center justify-center gap-2 hover:bg-[#4A4A30] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#5A5A40]/20"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t.analyzing}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    {t.generatePlan}
                  </>
                )}
              </button>
            </form>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex gap-3 text-red-600 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {analysis && (
              <div className="p-6 bg-white rounded-2xl border border-black/5 space-y-4">
                <h3 className="text-xs uppercase tracking-widest font-bold opacity-40">{t.groundingSources}</h3>
                <div className="space-y-3">
                  {analysis.groundingChunks.search?.map((chunk: any, i: number) => (
                    <a key={i} href={chunk.web?.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-[#5A5A40] hover:underline">
                      <ExternalLink className="w-3 h-3" />
                      {chunk.web?.title || 'Search Source'}
                    </a>
                  ))}
                  {analysis.groundingChunks.maps?.map((chunk: any, i: number) => (
                    <a key={i} href={chunk.maps?.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-[#5A5A40] hover:underline">
                      <MapPin className="w-3 h-3" />
                      {chunk.maps?.title || 'Maps Source'}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Right Column: Weekly Plan */}
          <section className="space-y-8">
            {!ideas.length && !isAnalyzing && (
              <div className="h-full min-h-[400px] border-2 border-dashed border-black/5 rounded-3xl flex flex-col items-center justify-center text-center p-12 space-y-4">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <Calendar className="w-8 h-8 opacity-20" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-serif">{t.weeklyPlanAwaits}</h3>
                  <p className="text-sm text-[#5A5A40]/60 max-w-xs">{t.weeklyPlanSubtitle}</p>
                </div>
              </div>
            )}

            {isAnalyzing && (
              <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-32 bg-white/50 rounded-2xl animate-pulse border border-black/5" />
                ))}
              </div>
            )}

            {ideas.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-serif">{t.weeklySchedule}</h2>
                  <div className="flex items-center gap-4">
                    <label className="text-[10px] uppercase tracking-wider font-bold opacity-50">{t.imageQuality}:</label>
                    <select 
                      className="bg-white border border-black/5 rounded-lg px-2 py-1 text-xs focus:outline-none"
                      value={imageSize}
                      onChange={(e) => setImageSize(e.target.value as any)}
                    >
                      <option value="1K">{t.standard}</option>
                      <option value="2K">{t.high}</option>
                      <option value="4K">{t.ultra}</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4">
                  {ideas.map((idea) => (
                    <motion.div 
                      key={idea.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "group bg-white rounded-2xl border border-black/5 overflow-hidden transition-all",
                        selectedIdea?.id === idea.id ? "ring-2 ring-[#5A5A40]" : "hover:border-[#5A5A40]/30"
                      )}
                    >
                      <div 
                        className="p-6 cursor-pointer flex items-center justify-between"
                        onClick={() => setSelectedIdea(selectedIdea?.id === idea.id ? null : idea)}
                      >
                        <div className="flex items-center gap-6">
                          <div className="w-12 text-center">
                            <span className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">{idea.day.slice(0, 3)}</span>
                            <span className="text-lg font-serif font-bold">0{ideas.indexOf(idea) + 1}</span>
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-medium group-hover:text-[#5A5A40] transition-colors">{idea.title}</h4>
                            <p className="text-xs text-[#5A5A40]/60">{idea.description}</p>
                          </div>
                        </div>
                        <ChevronRight className={cn("w-5 h-5 opacity-20 transition-transform", selectedIdea?.id === idea.id && "rotate-90 opacity-100")} />
                      </div>

                      <AnimatePresence>
                        {selectedIdea?.id === idea.id && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-black/5 bg-[#F9F9F7]"
                          >
                            <div className="p-8 space-y-8">
                              {/* Content Generation */}
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <h5 className="text-[10px] uppercase tracking-widest font-bold opacity-50">{t.postContent}</h5>
                                  {!postContents[idea.id]?.text && (
                                    <button 
                                      onClick={() => handleGenerateContent(idea)}
                                      disabled={postContents[idea.id]?.loading}
                                      className="text-xs font-semibold text-[#5A5A40] flex items-center gap-1.5 hover:underline disabled:opacity-50"
                                    >
                                      {postContents[idea.id]?.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                      {t.generateCopy}
                                    </button>
                                  )}
                                </div>
                                
                                {postContents[idea.id]?.text ? (
                                  <div className="prose prose-sm max-w-none bg-white p-6 rounded-xl border border-black/5 shadow-sm">
                                    <Markdown>{postContents[idea.id].text}</Markdown>
                                  </div>
                                ) : postContents[idea.id]?.loading ? (
                                  <div className="space-y-2">
                                    <div className="h-4 bg-black/5 rounded animate-pulse w-3/4" />
                                    <div className="h-4 bg-black/5 rounded animate-pulse w-full" />
                                    <div className="h-4 bg-black/5 rounded animate-pulse w-5/6" />
                                  </div>
                                ) : (
                                  <p className="text-xs italic text-[#5A5A40]/40">{t.clickToGenerateText}</p>
                                )}
                              </div>

                              {/* Image Generation */}
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <h5 className="text-[10px] uppercase tracking-widest font-bold opacity-50">{t.visualAsset}</h5>
                                  {!postContents[idea.id]?.imageUrl && (
                                    <button 
                                      onClick={() => handleGenerateImage(idea)}
                                      disabled={postContents[idea.id]?.imageLoading}
                                      className="text-xs font-semibold text-[#5A5A40] flex items-center gap-1.5 hover:underline disabled:opacity-50"
                                    >
                                      {postContents[idea.id]?.imageLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
                                      {t.generateImage}
                                    </button>
                                  )}
                                </div>

                                {postContents[idea.id]?.imageUrl ? (
                                  <div className="relative group/img aspect-square max-w-md mx-auto overflow-hidden rounded-2xl border border-black/5 shadow-xl">
                                    <img 
                                      src={postContents[idea.id].imageUrl} 
                                      alt={idea.title} 
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                      <button 
                                        onClick={() => handleGenerateImage(idea)}
                                        className="bg-white text-black px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2"
                                      >
                                        <Sparkles className="w-3 h-3" />
                                        {t.regenerate}
                                      </button>
                                    </div>
                                  </div>
                                ) : postContents[idea.id]?.imageLoading ? (
                                  <div className="aspect-square max-w-md mx-auto bg-black/5 rounded-2xl animate-pulse flex flex-col items-center justify-center gap-4">
                                    <Loader2 className="w-8 h-8 animate-spin opacity-20" />
                                    <p className="text-[10px] uppercase tracking-widest font-bold opacity-30">{t.creatingVisual}</p>
                                  </div>
                                ) : (
                                  <div className="aspect-video bg-white rounded-xl border border-dashed border-black/10 flex items-center justify-center">
                                    <p className="text-xs italic text-[#5A5A40]/40">{t.clickToGenerateImage}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-black/5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 opacity-40">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            <p className="text-[10px] uppercase tracking-widest font-bold">{t.poweredBy}</p>
          </div>
          <p className="text-[10px] uppercase tracking-widest font-bold">© 2026 SocialPlanner AI</p>
        </div>
      </footer>
    </div>
  );
}
