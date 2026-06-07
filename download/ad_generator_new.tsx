
// ─── AI Ad Generator Page (viewmax.io exact match) ───────────────────────

const AD_FORMATS = [
  { value: "blank", label: "Blank", desc: "No format assist" },
  { value: "ugc_handheld", label: "UGC Handheld", desc: "Static selfie product reads" },
  { value: "clothing_try_on", label: "Clothing Try On", desc: "Creator garment try-ons" },
  { value: "ugc_yapping", label: "UGC Yapping", desc: "FaceTime-style app rants" },
  { value: "fruit_cutting", label: "Fruit Cutting", desc: "Low-key cutting board reads" },
  { value: "hyper_motion", label: "Hyper Motion", desc: "Fast product highlights" },
];

const AD_MODELS = [
  { value: "seedance", label: "Seedance 2", icon: "🎬" },
  { value: "seedance_fast", label: "Seedance 2 Fast", icon: "⚡" },
  { value: "veo3_fast", label: "Veo 3.1 Fast", icon: "🚀" },
  { value: "veo3", label: "Veo 3.1", icon: "🌟" },
  { value: "grok_imagine", label: "Grok Imagine", icon: "✨" },
];

const AD_VOICES = [
  { value: "adam_selim", label: "Adam Selim", gender: "Male" },
  { value: "claire_benne", label: "Claire Benne", gender: "Female" },
  { value: "evan_brooks", label: "Evan Brooks", gender: "Male" },
  { value: "evan_park", label: "Evan Park", gender: "Male" },
  { value: "luca_bennett", label: "Luca Bennett", gender: "Male" },
  { value: "maya_ellis", label: "Maya Ellis", gender: "Female" },
  { value: "alexis_vale", label: "Alexis Vale", gender: "Female" },
  { value: "sofia_lane", label: "Sofia Lane", gender: "Female" },
  { value: "joey_wheeler", label: "Joey Wheeler", gender: "Male" },
  { value: "christina_park", label: "Christina Park", gender: "Female" },
];

const AD_AVATARS = [
  { value: "tenzin_dorje", label: "Tenzin Dorje", age: "60s", gender: "man" },
  { value: "sasha_monroe", label: "Sasha Monroe", age: "40s", gender: "woman" },
  { value: "claire_bennett", label: "Claire Bennett", age: "30s", gender: "woman" },
  { value: "evan_park", label: "Evan Park", age: "30s", gender: "man" },
  { value: "lena_noir", label: "Lena Noir", age: "20s", gender: "woman" },
  { value: "miles_carter", label: "Miles Carter", age: "30s", gender: "man" },
  { value: "sofia_lane", label: "Sofia Lane", age: "30s", gender: "woman" },
  { value: "evan_brooks", label: "Evan Brooks", age: "20s", gender: "man" },
  { value: "nina_sol", label: "Nina Sol", age: "20s", gender: "woman" },
  { value: "victor_hale", label: "Victor Hale", age: "60s", gender: "man" },
  { value: "clara_wren", label: "Clara Wren", age: "30s", gender: "woman" },
  { value: "nico_reyes", label: "Nico Reyes", age: "30s", gender: "man" },
  { value: "rowan_vale", label: "Rowan Vale", age: "20s", gender: "woman" },
  { value: "adam_selim", label: "Adam Selim", age: "30s", gender: "man" },
  { value: "maya_ellis", label: "Maya Ellis", age: "20s", gender: "woman" },
  { value: "luca_bennett", label: "Luca Bennett", age: "20s", gender: "man" },
  { value: "cal_reid", label: "Cal Reid", age: "20s", gender: "man" },
  { value: "mina_park", label: "Mina Park", age: "40s", gender: "woman" },
  { value: "leo_marin", label: "Leo Marin", age: "20s", gender: "man" },
  { value: "sienna_vale", label: "Sienna Vale", age: "20s", gender: "woman" },
  { value: "nora_blake", label: "Nora Blake", age: "20s", gender: "woman" },
  { value: "avery_monroe", label: "Avery Monroe", age: "30s", gender: "woman" },
  { value: "sienna_brooks", label: "Sienna Brooks", age: "20s", gender: "woman" },
  { value: "dante_cruz", label: "Dante Cruz", age: "30s", gender: "man" },
  { value: "mira_vale", label: "Mira Vale", age: "20s", gender: "woman" },
];

// Format prompt augmentations
const FORMAT_PROMPTS: Record<string, string> = {
  blank: "",
  ugc_handheld: "UGC handheld selfie style: A person holds the product close to the camera, speaking directly to the viewer as if showing a friend. Shaky handheld camera, natural lighting, authentic and relatable tone. The person reads the product name and key selling points while showing it off. ",
  clothing_try_on: "Clothing try-on style: A creator shows off wearing the garment, doing a full spin to display how it fits. They touch the fabric, comment on the material quality, and show the item from multiple angles. Natural body movement, fashion-forward presentation. ",
  ugc_yapping: "UGC yapping FaceTime-style: The creator rants passionately about the product while holding it up, like they're on a FaceTime call with a friend. Fast-paced talking, animated expressions, pointing at features. The energy is authentic, slightly chaotic, and highly engaging. ",
  fruit_cutting: "Fruit cutting style: Close-up shot of someone's hands cutting fruit on a wooden cutting board, with the product subtly placed nearby. The satisfying ASMR-like cutting sounds and visuals create a calming, low-key atmosphere while the product is naturally integrated into the scene. ",
  hyper_motion: "Hyper motion style: Rapid-cut product showcase with dynamic camera movements, zoom-ins, and fast transitions. The product is shown from multiple angles with quick reveals, feature callouts, and high-energy visuals. Bold text overlays highlight key benefits. ",
};

function AIAdGeneratorPage({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  // Core state
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState("blank");
  const [model, setModel] = useState("seedance");
  const [duration, setDuration] = useState(8);
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [resolution, setResolution] = useState("720p");
  const [activeTab, setActiveTab] = useState<"generate" | "history">("generate");

  // Dialog visibility
  const [showFormatDialog, setShowFormatDialog] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [showVoiceDialog, setShowVoiceDialog] = useState(false);

  // Product state
  const [productTab, setProductTab] = useState<"product" | "app">("product");
  const [productUrl, setProductUrl] = useState("");
  const [productImageUrl, setProductImageUrl] = useState("");
  const [productPreview, setProductPreview] = useState("");
  const [productUploading, setProductUploading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [savedProducts] = useState<{name: string; imageUrl: string; id: string}[]>([]);

  // Avatar state
  const [avatarGender, setAvatarGender] = useState<"All" | "Female" | "Male">("All");
  const [avatarAge, setAvatarAge] = useState("All");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [customAvatarPreview, setCustomAvatarPreview] = useState("");
  const [customAvatarUploading, setCustomAvatarUploading] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState("");

  // Voice state
  const [selectedVoice, setSelectedVoice] = useState("");
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [voicePreview, setVoicePreview] = useState("");
  const [voiceUploading, setVoiceUploading] = useState(false);
  const [voiceAudioUrl, setVoiceAudioUrl] = useState("");

  // Result
  const [result, setResult] = useState<ToolResult>({ loading: false, error: null });
  const [feed, setFeed] = useState<{ url: string; prompt: string; model: string; format: string; id: string }[]>([]);

  // Refs
  const productInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);

  // Filter avatars
  const filteredAvatars = AD_AVATARS.filter((a) => {
    if (avatarGender !== "All" && a.gender !== avatarGender.toLowerCase()) return false;
    if (avatarAge !== "All" && a.age !== avatarAge.replace("s", "")) return false;
    return true;
  });

  const isVoiceAvailable = model === "seedance" || model === "seedance_fast";
  const canGenerate = prompt.trim().length > 0;

  // Product upload
  const handleProductImageUpload = async (file: File) => {
    setProductUploading(true);
    setProductPreview(URL.createObjectURL(file));
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload-avatar", { method: "POST", body: formData });
      const data = await res.json();
      if (data.avatarUrl) setProductImageUrl(data.avatarUrl);
    } catch (err) { console.error("Product upload failed:", err); }
    finally { setProductUploading(false); }
  };

  // Avatar upload
  const handleAvatarUpload = async (file: File) => {
    setCustomAvatarPreview(URL.createObjectURL(file));
    setCustomAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload-avatar", { method: "POST", body: formData });
      const data = await res.json();
      if (data.avatarUrl) { setCustomAvatarUrl(data.avatarUrl); setSelectedAvatar(""); }
    } catch (err) { console.error("Avatar upload failed:", err); }
    finally { setCustomAvatarUploading(false); }
  };

  // Voice upload
  const handleVoiceUpload = async (file: File) => {
    setVoiceFile(file);
    setVoicePreview(URL.createObjectURL(file));
    setVoiceUploading(true);
    try {
      const formData = new FormData();
      formData.append("audio", file);
      const res = await fetch("/api/allinone/upload-voice", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) setVoiceAudioUrl(data.url);
    } catch (err) { console.error("Voice upload failed:", err); }
    finally { setVoiceUploading(false); }
  };

  // Build prompt
  const buildFullPrompt = (): string => {
    const formatPrefix = FORMAT_PROMPTS[format] || "";
    let fullPrompt = formatPrefix + prompt.trim();
    if (productImageUrl || selectedProduct) fullPrompt += " [Product image reference provided]";
    if (selectedAvatar || customAvatarUrl) fullPrompt += " [Creator/Avatar reference provided]";
    if (selectedVoice) { const voice = AD_VOICES.find((v) => v.value === selectedVoice); if (voice) fullPrompt += ` [Voice style: ${voice.label}, ${voice.gender}]`; }
    if (voiceAudioUrl) fullPrompt += " [Voice audio reference provided]";
    return fullPrompt;
  };

  const mapModel = (m: string): string => {
    switch (m) { case "seedance": case "seedance_fast": return "seedance"; case "veo3_fast": return "veo3_fast"; case "veo3": return "veo3_lite"; case "grok_imagine": return "seedance"; default: return "seedance"; }
  };

  // Generate
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setResult({ loading: true, error: null });
    try {
      const fullPrompt = buildFullPrompt();
      const res = await fetch("/api/allinone/ad-generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullPrompt, format, model: mapModel(model), duration, aspectRatio, resolution, productImageUrl: productImageUrl || undefined, avatarImageUrl: customAvatarUrl || undefined, selectedVoice: selectedVoice || undefined, voiceAudioUrl: voiceAudioUrl || undefined }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setResult({ loading: false, error: data.error || "Ad generation failed" }); return; }
      setResult({ loading: false, error: null, url: data.videoUrl });
      if (data.videoUrl) setFeed((prev) => [{ url: data.videoUrl, prompt: prompt.trim(), model: AD_MODELS.find((m) => m.value === model)?.label || model, format: AD_FORMATS.find((f) => f.value === format)?.label || format, id: Date.now().toString() }, ...prev]);
    } catch (err) { setResult({ loading: false, error: err instanceof Error ? err.message : "Failed to generate ad" }); }
  };

  return (
    <div className="max-w-[1060px] mx-auto px-3 sm:px-6 py-4">
      <h1 className="text-2xl font-bold mb-4" style={{ color: D.textPrimary }}>AI Ad Generator</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg w-fit" style={{ backgroundColor: "rgba(0,0,0,0.04)" }}>
        {(["generate", "history"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className="px-4 py-2 rounded-md text-sm font-medium transition-all"
            style={{ backgroundColor: activeTab === tab ? D.white : "transparent", color: activeTab === tab ? D.textPrimary : D.textMuted, boxShadow: activeTab === tab ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
            {tab === "generate" ? "Generate" : "History"}
          </button>
        ))}
      </div>

      {activeTab === "generate" ? (
        <div className="flex flex-col lg:flex-row gap-3">
          {/* LEFT: Prompt + Toolbar */}
          <div className="flex-1 min-w-0">
            <div className="rounded-[22px] sm:rounded-[28px] border p-3 sm:p-3.5" style={{ backgroundColor: "rgba(120,120,120,0.08)", borderColor: "rgba(120,120,120,0.2)" }}>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe what happens in the ad..." rows={4}
                className="w-full px-4 py-3 text-[15px] leading-6 font-medium placeholder-gray-400 resize-none focus:outline-none" style={{ backgroundColor: "transparent", border: "none", color: D.textPrimary, minHeight: "132px" }} />
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <ToolbarBtn label="Format" icon={<PlusIconSmall />} onClick={() => setShowFormatDialog(true)} />
                <div className="relative">
                  <ToolbarBtn label={AD_MODELS.find((m) => m.value === model)?.label || "Model"} icon={<span className="text-sm">{AD_MODELS.find((m) => m.value === model)?.icon}</span>} onClick={() => setShowModelPicker(!showModelPicker)} chevron />
                  {showModelPicker && <ModelPickerPopup model={model} setModel={(v) => { setModel(v); setShowModelPicker(false); }} onClose={() => setShowModelPicker(false)} />}
                </div>
                <div className="relative">
                  <ToolbarBtn label={`${duration}s`} icon={<ClockIcon />} onClick={() => setShowDurationPicker(!showDurationPicker)} />
                  {showDurationPicker && <DurationPopup duration={duration} setDuration={(v) => { setDuration(v); }} aspectRatio={aspectRatio} setAspectRatio={setAspectRatio} resolution={resolution} setResolution={setResolution} onClose={() => setShowDurationPicker(false)} />}
                </div>
                <ToolbarBtn label="Add references" icon={<PlusIconSmall />} onClick={() => {}} />
                <ToolbarBtn label="" icon={<SettingsIcon />} onClick={() => setShowDurationPicker(!showDurationPicker)} iconOnly />
              </div>
            </div>
            {result.error && <ErrorDisplay error={result.error} />}
            {result.loading && (<div className="mt-4 rounded-xl p-6 text-center" style={{ backgroundColor: D.inputBg, border: `1px solid ${D.cardBorder}` }}><div className="w-8 h-8 rounded-full border-3 border-purple-500 border-t-transparent animate-spin mx-auto mb-3" /><p className="text-sm font-medium" style={{ color: D.textPrimary }}>Generating your ad...</p><p className="text-xs mt-1" style={{ color: D.textMuted }}>This may take 1-3 minutes</p></div>)}
            {result.url && !result.loading && <VideoResult url={result.url} />}
          </div>

          {/* RIGHT: Product / Avatar / Voice / Generate */}
          <div className="grid grid-cols-3 lg:grid-cols-1 gap-2 lg:w-[260px] shrink-0">
            <RefCard label="Product" preview={productPreview || selectedProduct} uploading={productUploading} icon={<PackageIcon />} onClick={() => setShowProductDialog(true)} />
            <RefCard label="Avatar" preview={customAvatarPreview || selectedAvatar} uploading={customAvatarUploading} icon={<UserRoundIcon />} onClick={() => setShowAvatarDialog(true)} />
            <RefCard label="Voice" preview={selectedVoice ? AD_VOICES.find((v) => v.value === selectedVoice)?.label || "" : voicePreview ? "Custom" : ""} uploading={voiceUploading} icon={<VoiceIconSmall />} onClick={() => isVoiceAvailable && setShowVoiceDialog(true)} disabled={!isVoiceAvailable} disabledLabel="Seedance only" />
            <div className="col-span-3 lg:col-span-1">
              <button onClick={handleGenerate} disabled={!canGenerate || result.loading} className="w-full py-3 rounded-[10px] text-sm font-semibold transition-all flex items-center justify-center gap-1.5 disabled:cursor-not-allowed" style={{ backgroundColor: canGenerate && !result.loading ? D.black : "rgba(120,120,120,0.16)", color: canGenerate && !result.loading ? D.white : "rgba(0,0,0,0.4)" }}>
                {result.loading ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Generating...</> : <><span>Generate</span><SparklesIcon /><span className="opacity-70">20</span></>}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div>{feed.length === 0 ? (<div className="rounded-xl p-8 text-center" style={{ backgroundColor: D.inputBg, border: `1px solid ${D.cardBorder}` }}><p className="text-sm" style={{ color: D.textMuted }}>Your generated ads will appear here</p></div>) : (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{feed.map((item) => (<div key={item.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${D.cardBorder}` }}><video src={item.url} controls className="w-full" style={{ maxHeight: "250px" }} /><div className="p-2.5 flex items-center justify-between" style={{ backgroundColor: D.inputBg }}><div className="min-w-0 flex-1"><p className="text-xs font-semibold truncate" style={{ color: D.textPrimary }}>{item.format} · {item.model}</p><p className="text-[10px] truncate" style={{ color: D.textMuted }}>{item.prompt}</p></div><button onClick={() => { setPrompt(item.prompt); setActiveTab("generate"); }} className="ml-2 px-2 py-1 rounded-md text-[10px] font-semibold shrink-0" style={{ backgroundColor: D.purpleLight, color: D.purple }}>Reuse</button></div></div>))}</div>)}</div>
      )}

      {/* FORMAT DIALOG */}
      {showFormatDialog && (<DialogOverlay onClose={() => setShowFormatDialog(false)}><div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}><h2 className="text-lg font-bold mb-4" style={{ color: D.textPrimary }}>What type of video do you want to create?</h2><div className="space-y-2">{AD_FORMATS.map((f) => (<button key={f.value} onClick={() => { setFormat(f.value); setShowFormatDialog(false); }} className="flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition active:scale-[0.99]" style={{ borderColor: format === f.value ? "rgba(0,117,253,0.4)" : "#E2E8F0", backgroundColor: format === f.value ? "#EAF3FF" : "#F8FAFC", color: format === f.value ? "#0075FD" : D.textPrimary }}><div className="min-w-0"><p className="text-[13px] font-black tracking-tight">{f.label}</p><p className="text-[11px] font-medium" style={{ color: "#64748B" }}>{f.desc}</p></div>{format === f.value && <CheckIcon color="#0075FD" />}</button>))}</div></div></DialogOverlay>)}

      {/* PRODUCT DIALOG */}
      {showProductDialog && (<DialogOverlay onClose={() => setShowProductDialog(false)}><div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}><div className="flex gap-1 mb-4 p-1 rounded-lg w-fit" style={{ backgroundColor: "rgba(0,0,0,0.04)" }}>{(["product", "app"] as const).map((tab) => (<button key={tab} onClick={() => setProductTab(tab)} className="px-4 py-2 rounded-md text-sm font-medium transition-all" style={{ backgroundColor: productTab === tab ? D.white : "transparent", color: productTab === tab ? D.textPrimary : D.textMuted, boxShadow: productTab === tab ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>{tab === "product" ? "Product" : "App"}</button>))}</div><h2 className="text-lg font-bold mb-4" style={{ color: D.textPrimary }}>Add your {productTab}</h>{[0, 1].map((row) => (<div key={row} className="flex gap-2 mb-3"><input type="url" placeholder="www.yourproduct.com" value={row === 0 ? productUrl : ""} onChange={(e) => row === 0 && setProductUrl(e.target.value)} className="flex-1 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" style={{ backgroundColor: D.inputBg, border: `1px solid ${D.inputBorder}`, color: D.textPrimary }} /><button onClick={() => productInputRef.current?.click()} className="px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap" style={{ backgroundColor: "rgba(0,0,0,0.04)", border: `1px solid ${D.inputBorder}`, color: D.textPrimary }}>Upload image</button></div>))}<input ref={productInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleProductImageUpload(f); }} />{savedProducts.length > 0 && (<div className="mt-4"><p className="text-[10px] font-semibold tracking-[0.16em] uppercase mb-2" style={{ color: "#6B7280" }}>Saved products</p><div className="space-y-1.5">{savedProducts.map((p) => (<button key={p.id} onClick={() => { setSelectedProduct(p.name); setProductImageUrl(p.imageUrl); setShowProductDialog(false); }} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition" style={{ border: `1px solid ${selectedProduct === p.name ? "rgba(0,117,253,0.4)" : "#E2E8F0"}`, backgroundColor: selectedProduct === p.name ? "#EAF3FF" : "#F8FAFC" }}><span className="text-sm font-semibold" style={{ color: D.textPrimary }}>{p.name}</span></button>))}</div></div>)}{productPreview && (<div className="mt-3 rounded-xl overflow-hidden" style={{ border: `1px solid ${D.cardBorder}` }}><img src={productPreview} alt="Product" className="w-full max-h-48 object-contain" /></div>)}<div className="flex gap-2 mt-4"><button onClick={() => setShowProductDialog(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: D.black }}>Done</button></div></div></DialogOverlay>)}

      {/* AVATAR DIALOG */}
      {showAvatarDialog && (<DialogOverlay onClose={() => setShowAvatarDialog(false)}><div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}><h2 className="text-lg font-bold mb-4" style={{ color: D.textPrimary }}>Choose Avatar</h2><div className="flex gap-1 mb-2 p-1 rounded-lg w-fit" style={{ backgroundColor: "rgba(0,0,0,0.04)" }}>{(["All", "Female", "Male"] as const).map((g) => (<button key={g} onClick={() => setAvatarGender(g)} className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all" style={{ backgroundColor: avatarGender === g ? D.white : "transparent", color: avatarGender === g ? D.textPrimary : D.textMuted, boxShadow: avatarGender === g ? "0 1px 2px rgba(0,0,0,0.08)" : "none" }}>{g}</button>))}</div><div className="flex gap-1 mb-4 p-1 rounded-lg w-fit" style={{ backgroundColor: "rgba(0,0,0,0.04)" }}>{["All", "20s", "30s", "40s", "60s"].map((a) => (<button key={a} onClick={() => setAvatarAge(a)} className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all" style={{ backgroundColor: avatarAge === a ? D.white : "transparent", color: avatarAge === a ? D.textPrimary : D.textMuted, boxShadow: avatarAge === a ? "0 1px 2px rgba(0,0,0,0.08)" : "none" }}>{a === "All" ? "All ages" : a}</button>))}</div><button onClick={() => avatarInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-4 mb-4 text-sm font-semibold transition hover:border-purple-400" style={{ borderColor: D.inputBorder, backgroundColor: D.inputBg, color: D.textPrimary }}><PlusIcon /> New avatar — Generate or upload</button><input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }} />{customAvatarUploading && (<div className="mb-4 text-center"><div className="w-5 h-5 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mx-auto" /><p className="text-xs mt-1" style={{ color: D.textMuted }}>Uploading avatar...</p></div>)}<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">{filteredAvatars.map((av) => (<button key={av.value} onClick={() => { setSelectedAvatar(av.value); setCustomAvatarUrl(""); setCustomAvatarPreview(""); setShowAvatarDialog(false); }} className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition" style={{ border: selectedAvatar === av.value ? "2px solid #0075FD" : "1px solid #E2E8F0", backgroundColor: selectedAvatar === av.value ? "#EAF3FF" : D.white }}><div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: av.gender === "woman" ? "#FCE7F3" : "#DBEAFE", color: av.gender === "woman" ? "#EC4899" : "#3B82F6" }}>{av.label.charAt(0)}</div><p className="text-[11px] font-semibold text-center leading-tight" style={{ color: D.textPrimary }}>{av.label}</p><p className="text-[9px]" style={{ color: D.textMuted }}>{av.age} {av.gender}</p></button>))}</div><button onClick={() => setShowAvatarDialog(false)} className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: D.black }}>Done</button></div></DialogOverlay>)}

      {/* VOICE DIALOG */}
      {showVoiceDialog && (<DialogOverlay onClose={() => setShowVoiceDialog(false)}><div className="w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}><h2 className="text-lg font-bold mb-4" style={{ color: D.textPrimary }}>Voice Library</h2><div className="space-y-1.5 mb-4">{AD_VOICES.map((voice) => (<button key={voice.value} onClick={() => { setSelectedVoice(selectedVoice === voice.value ? "" : voice.value); setVoiceFile(null); setVoicePreview(""); setVoiceAudioUrl(""); }} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition" style={{ border: selectedVoice === voice.value ? "1px solid rgba(0,117,253,0.4)" : "1px solid #E2E8F0", backgroundColor: selectedVoice === voice.value ? "#EAF3FF" : "#F8FAFC" }}><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: voice.gender === "Female" ? "#FCE7F3" : "#DBEAFE", color: voice.gender === "Female" ? "#EC4899" : "#3B82F6" }}>{voice.label.charAt(0)}</div><div><p className="text-sm font-semibold" style={{ color: selectedVoice === voice.value ? "#0075FD" : D.textPrimary }}>{voice.label}</p><p className="text-xs" style={{ color: "#64748B" }}>{voice.gender}</p></div></div>{selectedVoice === voice.value && <CheckIcon color="#0075FD" />}</button>))}</div><div className="mb-4"><p className="text-[10px] font-semibold tracking-[0.16em] uppercase mb-2" style={{ color: "#6B7280" }}>Or upload your own voice</p>{voicePreview ? (<div className="rounded-xl p-3" style={{ backgroundColor: D.inputBg, border: `1px solid ${D.cardBorder}` }}><audio src={voicePreview} controls className="w-full" style={{ height: "40px" }} /><button onClick={() => { setVoiceFile(null); setVoicePreview(""); setVoiceAudioUrl(""); setSelectedVoice(""); }} className="mt-2 text-xs font-semibold" style={{ color: D.red }}>Remove voice</button></div>) : (<button onClick={() => voiceInputRef.current?.click()} className="w-full rounded-xl border-2 border-dashed p-6 text-center transition hover:border-purple-400" style={{ borderColor: D.inputBorder, backgroundColor: D.inputBg }}><p className="text-sm font-medium" style={{ color: D.textPrimary }}>Upload voice audio</p><p className="text-xs mt-1" style={{ color: D.textMuted }}>.mp3, .wav up to 10 MB</p></button>)}<input ref={voiceInputRef} type="file" accept="audio/mpeg,audio/mp3,audio/wav,.mp3,.wav" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVoiceUpload(f); }} /></div><div className="flex gap-2"><button onClick={() => { setSelectedVoice(""); setVoiceFile(null); setVoicePreview(""); setVoiceAudioUrl(""); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: D.inputBg, color: D.textPrimary, border: `1px solid ${D.inputBorder}` }}>Clear Voice</button><button onClick={() => setShowVoiceDialog(false)} disabled={!selectedVoice && !voiceAudioUrl} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ backgroundColor: D.black }}>Attach</button></div></div></DialogOverlay>)}
    </div>
  );
}

// ─── Shared sub-components for Ad Generator ─────────────────────────

function DialogOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}><div className="absolute inset-0 bg-black/50" /><div className="relative rounded-2xl p-5 max-h-[85vh] overflow-y-auto" style={{ backgroundColor: D.white, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}><button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5" style={{ color: D.textMuted }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>{children}</div></div>);
}

function ToolbarBtn({ label, icon, onClick, chevron, iconOnly }: { label: string; icon: React.ReactNode; onClick: () => void; chevron?: boolean; iconOnly?: boolean }) {
  return (<button onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-[10px] border px-2.5 py-2 text-xs font-semibold tracking-tight transition-all ${iconOnly ? "h-8 w-8 justify-center" : ""}`} style={{ borderColor: "rgba(120,120,120,0.2)", backgroundColor: "rgba(116,116,128,0.08)", color: "rgba(0,0,0,0.8)" }}>{icon}{label && <span>{label}</span>}{chevron && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-60"><path d="m6 9 6 6 6-6" /></svg>}</button>);
}

function ModelPickerPopup({ model, setModel, onClose }: { model: string; setModel: (v: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, [onClose]);
  return (<div ref={ref} className="absolute top-full left-0 mt-2 w-[280px] rounded-2xl p-1.5 z-50" style={{ backgroundColor: "rgba(0,0,0,0.03)", border: "1px solid #EEF0F4", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>{AD_MODELS.map((m) => (<button key={m.value} onClick={() => setModel(m.value)} className="flex w-full min-h-12 items-center justify-between gap-3 rounded-xl px-2.5 py-2.5 text-left transition" style={{ border: model === m.value ? "1px solid rgba(0,117,253,0.35)" : "1px solid transparent", backgroundColor: model === m.value ? "#EAF3FF" : "transparent", color: model === m.value ? "#0075FD" : D.textPrimary }}><span className="flex items-center gap-2.5"><span className="grid size-8 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: model === m.value ? "#D9EAFF" : D.white }}><span className="text-base">{m.icon}</span></span><span className="text-[13px] font-semibold">{m.label}</span></span>{model === m.value && <CheckIcon color="#0075FD" />}</button>))}</div>);
}

function DurationPopup({ duration, setDuration, aspectRatio, setAspectRatio, resolution, setResolution, onClose }: { duration: number; setDuration: (v: number) => void; aspectRatio: string; setAspectRatio: (v: string) => void; resolution: string; setResolution: (v: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, [onClose]);
  return (<div ref={ref} className="absolute top-full left-0 mt-2 w-[280px] rounded-2xl border bg-white p-3 z-50" style={{ border: "1px solid #EEF0F4", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}><p className="mb-2 text-[10px] font-semibold tracking-[0.16em] uppercase" style={{ color: "#6B7280" }}>Video Settings</p><div className="mb-3"><div className="grid grid-cols-3 gap-1.5 rounded-2xl p-1.5" style={{ backgroundColor: "rgba(0,0,0,0.03)" }}>{[{ v: "9:16", l: "Portrait" }, { v: "16:9", l: "Landscape" }, { v: "1:1", l: "Square" }].map((ar) => (<button key={ar.v} onClick={() => setAspectRatio(ar.v)} className="flex min-h-10 items-center justify-center gap-1 rounded-xl px-2 text-[12px] font-semibold transition" style={{ backgroundColor: aspectRatio === ar.v ? D.white : "transparent", color: aspectRatio === ar.v ? "#0075FD" : "#64748B", boxShadow: aspectRatio === ar.v ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>{ar.l}</button>))}</div></div><div className="mb-3"><div className="grid grid-cols-3 gap-1.5 rounded-2xl p-1.5" style={{ backgroundColor: "rgba(0,0,0,0.03)" }}>{["480p", "720p", "1080p"].map((res) => (<button key={res} onClick={() => setResolution(res)} className="min-h-10 rounded-xl px-2 text-[12px] font-semibold transition" style={{ backgroundColor: resolution === res ? D.white : "transparent", color: resolution === res ? "#0075FD" : "#64748B", boxShadow: resolution === res ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>{res}</button>))}</div></div><div className="space-y-1"><div className="flex items-center justify-between px-0.5"><span className="text-[10px] font-black tracking-[0.12em] uppercase" style={{ color: "#8A95A6" }}>Duration</span><span className="text-[10px] font-black tracking-[0.12em] uppercase" style={{ color: D.textPrimary }}>{duration}s</span></div><input type="range" min={4} max={15} step={1} value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} className="w-full h-10 cursor-grab" style={{ accentColor: "#0075FD" }} /></div></div>);
}

function RefCard({ label, preview, uploading, icon, onClick, disabled, disabledLabel }: { label: string; preview: string; uploading: boolean; icon: React.ReactNode; onClick: () => void; disabled?: boolean; disabledLabel?: string }) {
  return (<button onClick={disabled ? undefined : onClick} className="group relative flex flex-col items-center justify-center gap-2 rounded-[10px] border p-2.5 text-center transition sm:rounded-[14px] aspect-[2/3] w-full" style={{ borderColor: preview ? "rgba(0,117,253,0.4)" : "rgba(120,120,120,0.2)", backgroundColor: preview ? "rgba(0,117,253,0.06)" : "rgba(116,116,128,0.08)", opacity: disabled ? 0.4 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>{preview ? (<div className="flex flex-col items-center gap-1"><span className="text-[10px] font-semibold" style={{ color: "#0075FD" }}>{label}</span><span className="text-[11px] font-medium truncate max-w-full" style={{ color: D.textPrimary }}>{preview}</span></div>) : (<><span className="relative inline-flex size-6 items-center justify-center" style={{ color: "rgba(0,0,0,0.8)" }}>{icon}</span><span className="text-xs font-semibold tracking-tight" style={{ color: "rgba(0,0,0,0.8)" }}>{label}</span>{disabledLabel && <span className="text-[9px]" style={{ color: D.textDim }}>{disabledLabel}</span>}</>)}{uploading && <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-[10px]"><div className="w-5 h-5 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" /></div>}</button>);
}

function CheckIcon({ color }: { color: string }) { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>; }
function PlusIconSmall() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>; }
function ClockIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16.5 12" /></svg>; }
function SettingsIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" x2="14" y1="4" y2="4" /><line x1="10" x2="3" y1="4" y2="4" /><line x1="21" x2="12" y1="12" y2="12" /><line x1="8" x2="3" y1="12" y2="12" /><line x1="21" x2="16" y1="20" y2="20" /><line x1="12" x2="3" y1="20" y2="20" /><line x1="14" x2="14" y1="2" y2="6" /><line x1="8" x2="8" y1="10" y2="14" /><line x1="16" x2="16" y1="18" y2="22" /></svg>; }
function PackageIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M11 21.73a2 2 0 002 0l7-4A2 2 0 0021 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73z" /><path d="M12 22V12" /><polyline points="3.29 7 12 12 20.71 7" /><path d="m7.5 4.27 9 5.15" /></svg>; }
function UserRoundIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 00-16 0" /></svg>; }
function VoiceIconSmall() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4.702a.705.705 0 00-1.203-.498L6.413 7.587A1.4 1.4 0 015.416 8H3a1 1 0 00-1 1v6a1 1 0 001 1h2.416a1.4 1.4 0 01.997.413l3.383 3.384A.705.705 0 0011 19.298z" /><path d="M16 9a5 5 0 010 6" /><path d="M19.364 18.364a9 9 0 010-12.728" /></svg>; }
