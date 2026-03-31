import React, { useState, useRef } from 'react';
import { 
  FilePlus, 
  Trash2, 
  Copy, 
  Check, 
  FileText, 
  Terminal,
  Eraser,
  Layers
} from 'lucide-react-native';
import { FileContext, ProjectStats } from '../types';

interface Props {
  files: FileContext[];
  stats: ProjectStats;
  onAddFiles: (files: FileContext[]) => void;
  onRemoveFile: (index: number) => void;
  onClear: () => void;
}

const CodeContextBuilder: React.FC<Props> = ({ files, stats, onAddFiles, onRemoveFile, onClear }) => {
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const newFiles: FileContext[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const content = await file.text();
      newFiles.push({
        name: file.name,
        path: file.name,
        content,
        size: file.size
      });
    }
    onAddFiles(newFiles);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const generateContextString = () => {
    let context = "I am working on an Expo project called PTE Flow. Here is the relevant codebase metadata and content:\n\n";
    context += `[PROJECT METADATA]\n`;
    context += `Framework: ${stats.framework || 'React Native'}\n`;
    context += `Tasks: ${stats.pteModules?.join(', ') || 'None detected'}\n`;
    context += `High-Weight Focus: Repeat Sentence (56), Read Aloud (51.5)\n\n`;
    
    files.forEach(f => {
      context += `--- START FILE: ${f.name} ---\n`;
      context += f.content;
      context += `\n--- END FILE: ${f.name} ---\n\n`;
    });
    context += "Please use this codebase as context to help me with my next steps.";
    return context;
  };

  const copyToClipboard = () => {
    const text = generateContextString();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid lg:grid-cols-5 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between border-l-4 border-[#2563EB]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <Layers size={20} color="#60A5FA" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Metadata</p>
              <h3 className="font-bold text-sm">{stats.pteModules?.length || 0} Modules Detected</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">Prompt Context</h2>
            <button onClick={onClear} className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
              <Eraser size={20} />
            </button>
          </div>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group"
          >
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:bg-white transition-all">
              <FilePlus size={24} />
            </div>
            <p className="text-sm font-medium text-slate-500 group-hover:text-blue-600">Add project source files</p>
            <input type="file" ref={fileInputRef} multiple className="hidden" onChange={handleFileChange} accept=".ts,.tsx,.json,.js,.jsx,.md" />
          </div>

          <div className="mt-6 space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {files.length === 0 ? (
              <p className="text-center py-10 text-slate-400 text-sm italic">Add constants/modules.ts or geminiService.ts</p>
            ) : (
              files.map((file, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg group animate-in slide-in-from-left-2 fade-in duration-300">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText size={16} color="#94a3b8" style={{ flexShrink: 0 }} />
                    <span className="text-sm font-medium text-slate-700 truncate">{file.name}</span>
                  </div>
                  <button onClick={() => onRemoveFile(i)} className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-3 space-y-6">
        <div className="bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-800 h-full flex flex-col min-h-[500px]">
          <div className="bg-slate-800 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal size={18} color="#60A5FA" />
              <span className="text-slate-300 text-sm font-mono tracking-tighter">STUDIO_READY_PAYLOAD</span>
            </div>
            <button 
              onClick={copyToClipboard}
              disabled={files.length === 0}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all shadow-lg ${
                copied 
                ? 'bg-green-600 text-white shadow-green-200/20' 
                : files.length > 0 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20' 
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Copy for AI Studio'}
            </button>
          </div>
          
          <div className="flex-1 p-6 font-mono text-[11px] overflow-y-auto text-slate-500 leading-relaxed">
            {files.length > 0 ? (
              <pre className="whitespace-pre-wrap text-blue-100/80">
                {generateContextString()}
              </pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 italic">
                <Terminal size={48} color="#000000" style={{ marginBottom: 16, opacity: 0.1 }} />
                <p>Awaiting source code context...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeContextBuilder;