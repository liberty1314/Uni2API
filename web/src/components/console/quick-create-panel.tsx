"use client";

import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Paperclip, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { saveWorkspaceQuickCreateDraft } from "@/lib/workspace-draft";
import type { StoredReferenceImage } from "@/store/image-conversations";

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("读取参考图失败"));
    reader.readAsDataURL(file);
  });
}

export function QuickCreatePanel({
  models,
  disabled = false,
}: {
  models: string[];
  disabled?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(models[0] || "gpt-image-2");
  const [ratio, setRatio] = useState("1:1");
  const [quality, setQuality] = useState("auto");
  const [count, setCount] = useState("1");
  const [referenceImages, setReferenceImages] = useState<StoredReferenceImage[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async () => {
    if (disabled) return;
    if (!prompt.trim()) {
      toast.error("先写下想创作的内容");
      return;
    }
    setIsSaving(true);
    try {
      const id = await saveWorkspaceQuickCreateDraft({
        prompt: prompt.trim(),
        model,
        ratio,
        quality,
        count,
        referenceImages,
      });
      router.push(`/image?draft=${encodeURIComponent(id)}`);
    } catch {
      toast.error("保存创作草稿失败");
    } finally {
      setIsSaving(false);
    }
  };

  const addReferenceImages = async (files: FileList | null) => {
    if (!files) return;
    try {
      const additions = await Promise.all(Array.from(files).slice(0, 3).map(async (file) => ({
        name: file.name,
        type: file.type || "image/png",
        dataUrl: await readFileAsDataUrl(file),
      })));
      setReferenceImages((current) => [...current, ...additions].slice(0, 3));
    } catch {
      toast.error("参考图读取失败");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="ui-surface-subtle p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[var(--ui-text)]">
            <Sparkles className="size-4 text-[var(--ui-creative)]" aria-hidden="true" />
            <h2 className="font-semibold">快速创作</h2>
          </div>
          <p className="mt-1 text-sm text-[var(--ui-text-muted)]">先保存想法，完整参数会在创作页继续。</p>
        </div>
        <span className="rounded-full bg-[var(--ui-pressed)] px-2.5 py-1 text-xs text-[var(--ui-text-muted)]">草稿模式</span>
      </div>
      <div className="mt-5 space-y-4">
        <Textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") void submit(); }} placeholder="描述你想看到的画面..." className="min-h-28 resize-y" disabled={disabled} aria-label="创作提示词" />
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1.5 text-xs text-[var(--ui-text-muted)]">模型<Select value={model} onValueChange={setModel}><SelectTrigger aria-label="选择模型"><SelectValue /></SelectTrigger><SelectContent>{(models.length ? models : ["gpt-image-2"]).map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></label>
          <label className="space-y-1.5 text-xs text-[var(--ui-text-muted)]">画幅<Select value={ratio} onValueChange={setRatio}><SelectTrigger aria-label="选择画幅"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1:1">正方形 1:1</SelectItem><SelectItem value="16:9">横向 16:9</SelectItem><SelectItem value="9:16">竖向 9:16</SelectItem></SelectContent></Select></label>
          <label className="space-y-1.5 text-xs text-[var(--ui-text-muted)]">质量<Select value={quality} onValueChange={setQuality}><SelectTrigger aria-label="选择质量"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="auto">自动</SelectItem><SelectItem value="high">高</SelectItem><SelectItem value="medium">中</SelectItem></SelectContent></Select></label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-[var(--ui-text-muted)]"><span>数量</span><Input type="number" min={1} max={10} value={count} onChange={(event) => setCount(event.target.value)} className="h-11 w-20 text-center" disabled={disabled} /></label>
          <input ref={inputRef} type="file" accept="image/*" multiple aria-hidden="true" tabIndex={-1} className="sr-only" onChange={(event) => void addReferenceImages(event.target.files)} />
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={disabled}><Paperclip className="size-4" />参考图</Button>
          {referenceImages.map((image, index) => <span key={`${image.name}-${index}`} className="inline-flex max-w-40 items-center gap-1 rounded-full bg-[var(--ui-pressed)] px-2.5 py-1 text-xs text-[var(--ui-text-muted)]"><ImagePlus className="size-3.5" /><span className="truncate">{image.name}</span><button type="button" className="rounded-full p-0.5 hover:bg-[var(--ui-surface)]" aria-label={`移除参考图 ${image.name}`} onClick={() => setReferenceImages((current) => current.filter((_, currentIndex) => currentIndex !== index))}><X className="size-3" /></button></span>)}
          <Button type="button" className="ml-auto" onClick={() => void submit()} disabled={disabled || isSaving}><>{isSaving ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}</>开始创作</Button>
        </div>
      </div>
    </div>
  );
}
