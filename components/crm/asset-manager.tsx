import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Search, Upload, FileText, Image as ImageIcon, Trash2, Loader2, X, Check } from "lucide-react"

export interface Asset {
    id: string
    file_name: string
    file_type: string
    file_size: number
    storage_path: string
    public_url: string
    created_at: string
}

interface AssetManagerProps {
    onInsert: (asset: Asset, variant?: 'small' | 'original') => void
    onClose: () => void
}

export function AssetManager({ onInsert, onClose }: AssetManagerProps) {
    const [assets, setAssets] = useState<Asset[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [search, setSearch] = useState("")
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Fetch assets on load
    useEffect(() => {
        fetchAssets()
    }, [])

    const fetchAssets = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('assets')
            .select('*')
            .order('created_at', { ascending: false })

        if (data) setAssets(data)
        if (error) console.error("Error fetching assets:", error)
        setLoading(false)
    }

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return
        setUploading(true)
        const file = e.target.files[0]

        // Upload to Supabase Storage (Bucket: 'attachments', Folder: 'library')
        const filePath = `library/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

        try {
            const { error: uploadError } = await supabase.storage
                .from('attachments')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // Get Public URL
            const { data: urlData } = supabase.storage
                .from('attachments')
                .getPublicUrl(filePath)

            // Save to DB
            const { data: newAsset, error: dbError } = await supabase
                .from('assets')
                .insert({
                    file_name: file.name,
                    file_type: file.type,
                    file_size: file.size,
                    storage_path: filePath,
                    public_url: urlData.publicUrl
                })
                .select()
                .single()

            if (dbError) throw dbError
            if (newAsset) setAssets([newAsset, ...assets])

        } catch (error) {
            console.error("Upload failed:", error)
            alert("Failed to upload asset")
        } finally {
            setUploading(false)
            // Reset file input
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleDelete = async (id: string, path: string) => {
        if (!confirm("Delete this asset permanently?")) return

        // Delete from DB
        await supabase.from('assets').delete().eq('id', id)
        // Delete from Storage
        await supabase.storage.from('attachments').remove([path])

        setAssets(assets.filter(a => a.id !== id))
    }

    const filteredAssets = assets.filter(a =>
        a.file_name.toLowerCase().includes(search.toLowerCase())
    )

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="px-4 py-3 bg-white border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-semibold text-slate-700">Asset Library</h3>
                <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-4 h-4 text-slate-500" />
                </button>
            </div>

            {/* Toolbar */}
            <div className="p-3 flex gap-2 border-b border-slate-200 bg-white">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search files..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-100 border-none rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none"
                    />
                </div>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Upload
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    onChange={handleUpload}
                />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
                ) : filteredAssets.length === 0 ? (
                    <div className="text-center text-slate-400 py-8 text-sm">No assets found. Upload one!</div>
                ) : (
                    filteredAssets.map(asset => (
                        <div key={asset.id} className="group flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {asset.file_type.startsWith('image/') ? (
                                        <img src={asset.public_url} alt="" className="w-full h-full object-cover rounded-lg" />
                                    ) : (
                                        <FileText className="w-5 h-5 text-slate-400" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-700 truncate">{asset.file_name}</p>
                                    <p className="text-xs text-slate-400">{formatSize(asset.file_size)}</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {asset.file_type.startsWith('image/') ? (
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => onInsert(asset, 'small')}
                                            className="px-2 py-1 text-xs bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 font-medium transition-colors"
                                            title="Insert Small (300px)"
                                        >
                                            Small
                                        </button>
                                        <button
                                            onClick={() => onInsert(asset, 'original')}
                                            className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200 font-medium transition-colors"
                                            title="Insert Original Size"
                                        >
                                            Full
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => onInsert(asset)}
                                        className="px-3 py-1 text-xs bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 font-medium transition-colors"
                                    >
                                        Attach
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDelete(asset.id, asset.storage_path)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
