import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Copy, Save, Star, Upload, X } from "lucide-react";
import {
  fetchShopProducts,
  insertShopProduct,
  updateShopProduct,
  deleteShopProduct,
  replaceProductImages,
  replaceProductVariations,
  uploadShopProductImage,
  slugify,
  type ShopProductFull,
  type ShopProductImageRow,
  type ShopProductVariationRow,
  type PriceMode,
} from "@/lib/shop";

const SHARE_BASE = "https://rpxlpqehpzhofxuzjbws.supabase.co/functions/v1/product-og";
const MAX_IMAGES = 5;
const MAX_VARIATIONS = 5;

type EditState = {
  name: string;
  slug: string;
  description: string;
  category: string;
  active: boolean;
  sort_order: number;
  base_price_mode: PriceMode;
  base_unit_price: number;
  base_area_price_per_m2: number;
  base_fixed_price: number;
  base_min_price: number;
  download_url: string;
  download_label: string;
  images: ShopProductImageRow[];
  variations: ShopProductVariationRow[];
};

function emptyEdit(): EditState {
  return {
    name: "",
    slug: "",
    description: "",
    category: "",
    active: true,
    sort_order: 0,
    base_price_mode: "unit",
    base_unit_price: 0,
    base_area_price_per_m2: 0,
    base_fixed_price: 0,
    base_min_price: 0,
    download_url: "",
    download_label: "",
    images: [],
    variations: [],
  };
}

function toEdit(p: ShopProductFull): EditState {
  return {
    name: p.name,
    slug: p.slug,
    description: p.description,
    category: (p as any).category || "",
    active: p.active,
    sort_order: p.sort_order,
    base_price_mode: p.base_price_mode,
    base_unit_price: Number(p.base_unit_price) || 0,
    base_area_price_per_m2: Number(p.base_area_price_per_m2) || 0,
    base_fixed_price: Number(p.base_fixed_price) || 0,
    base_min_price: Number(p.base_min_price) || 0,
    download_url: (p as any).download_url || "",
    download_label: (p as any).download_label || "",
    images: p.images.map((i) => ({
      image_url: i.image_url,
      is_primary: i.is_primary,
      sort_order: i.sort_order,
    })),
    variations: p.variations.map((v) => ({
      label: v.label,
      price_mode: v.price_mode,
      unit_price: Number(v.unit_price) || 0,
      area_price_per_m2: Number(v.area_price_per_m2) || 0,
      fixed_price: Number(v.fixed_price) || 0,
      min_price: Number(v.min_price) || 0,
      sort_order: v.sort_order,
    })),
  };
}

const ShopProductsAdmin = () => {
  const [products, setProducts] = useState<ShopProductFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [edit, setEdit] = useState<EditState>(emptyEdit());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setProducts(await fetchShopProducts(false));
    } catch (e: any) {
      toast.error("Erro ao carregar: " + (e.message || e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const startNew = () => {
    setEditingId("new");
    setEdit(emptyEdit());
  };
  const startEdit = (p: ShopProductFull) => {
    setEditingId(p.id!);
    setEdit(toEdit(p));
  };
  const cancel = () => {
    setEditingId(null);
    setEdit(emptyEdit());
  };

  const save = async () => {
    if (!edit.name.trim()) {
      toast.error("Informe o nome do produto");
      return;
    }
    const slug = (edit.slug || slugify(edit.name)).trim();
    if (!slug) {
      toast.error("Slug inválido");
      return;
    }
    setSaving(true);
    try {
      let productId: string;
      const payload = {
        name: edit.name.trim(),
        slug,
        description: edit.description,
        category: edit.category.trim(),
        active: edit.active,
        sort_order: edit.sort_order,
        base_price_mode: edit.base_price_mode,
        base_unit_price: edit.base_unit_price || 0,
        base_area_price_per_m2: edit.base_area_price_per_m2 || 0,
        base_fixed_price: edit.base_fixed_price || 0,
        base_min_price: edit.base_min_price || 0,
      };
      if (editingId === "new") {
        const row = await insertShopProduct(payload);
        productId = row.id;
      } else {
        productId = editingId!;
        await updateShopProduct(productId, payload);
      }
      // ensure exactly one primary if any
      const imgs = edit.images.slice(0, MAX_IMAGES);
      if (imgs.length && !imgs.some((i) => i.is_primary)) imgs[0].is_primary = true;
      await replaceProductImages(productId, imgs);
      await replaceProductVariations(productId, edit.variations.slice(0, MAX_VARIATIONS));
      toast.success("Produto salvo");
      await load();
      cancel();
    } catch (e: any) {
      toast.error("Erro ao salvar: " + (e.message || e));
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async (id: string) => {
    if (!confirm("Excluir este produto?")) return;
    try {
      await deleteShopProduct(id);
      toast.success("Produto excluído");
      await load();
    } catch (e: any) {
      toast.error("Erro: " + (e.message || e));
    }
  };

  const copyLink = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(`${SHARE_BASE}/${slug}`);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  // Image handlers
  const addImageUrl = () => {
    if (edit.images.length >= MAX_IMAGES) return;
    setEdit({
      ...edit,
      images: [
        ...edit.images,
        { image_url: "", is_primary: edit.images.length === 0, sort_order: edit.images.length },
      ],
    });
  };
  const updateImage = (idx: number, patch: Partial<ShopProductImageRow>) => {
    const next = [...edit.images];
    next[idx] = { ...next[idx], ...patch };
    setEdit({ ...edit, images: next });
  };
  const setPrimary = (idx: number) => {
    setEdit({
      ...edit,
      images: edit.images.map((i, k) => ({ ...i, is_primary: k === idx })),
    });
  };
  const removeImage = (idx: number) => {
    const next = edit.images.filter((_, k) => k !== idx);
    if (next.length && !next.some((i) => i.is_primary)) next[0].is_primary = true;
    setEdit({ ...edit, images: next });
  };
  const uploadImage = async (file: File) => {
    if (edit.images.length >= MAX_IMAGES) {
      toast.error("Máximo de 5 fotos");
      return;
    }
    try {
      const url = await uploadShopProductImage(file);
      setEdit({
        ...edit,
        images: [
          ...edit.images,
          { image_url: url, is_primary: edit.images.length === 0, sort_order: edit.images.length },
        ],
      });
    } catch (e: any) {
      toast.error("Falha no upload: " + (e.message || e));
    }
  };

  // Variation handlers
  const addVariation = () => {
    if (edit.variations.length >= MAX_VARIATIONS) return;
    setEdit({
      ...edit,
      variations: [
        ...edit.variations,
        {
          label: "",
          price_mode: "unit",
          unit_price: 0,
          area_price_per_m2: 0,
          fixed_price: 0,
          min_price: 0,
          sort_order: edit.variations.length,
        },
      ],
    });
  };
  const updateVar = (idx: number, patch: Partial<ShopProductVariationRow>) => {
    const next = [...edit.variations];
    next[idx] = { ...next[idx], ...patch };
    setEdit({ ...edit, variations: next });
  };
  const removeVar = (idx: number) => {
    setEdit({ ...edit, variations: edit.variations.filter((_, k) => k !== idx) });
  };

  const renderPriceFields = (
    mode: PriceMode,
    values: { unit: number; area: number; fixed: number; min: number },
    onChange: (p: Partial<{ unit_price: number; area_price_per_m2: number; fixed_price: number; min_price: number }>) => void,
  ) => (
    <div className="grid grid-cols-2 gap-2">
      {mode === "unit" && (
        <input
          type="number"
          step="0.01"
          value={values.unit}
          onChange={(e) => onChange({ unit_price: Number(e.target.value) || 0 })}
          placeholder="R$/unidade"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      )}
      {mode === "area" && (
        <input
          type="number"
          step="0.01"
          value={values.area}
          onChange={(e) => onChange({ area_price_per_m2: Number(e.target.value) || 0 })}
          placeholder="R$/m²"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      )}
      {mode === "fixed" && (
        <input
          type="number"
          step="0.01"
          value={values.fixed}
          onChange={(e) => onChange({ fixed_price: Number(e.target.value) || 0 })}
          placeholder="Preço fixo R$"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      )}
      <input
        type="number"
        step="0.01"
        value={values.min}
        onChange={(e) => onChange({ min_price: Number(e.target.value) || 0 })}
        placeholder="Preço mínimo R$"
        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl p-6 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-card-foreground">Produtos da Loja Gráfica</h2>
          {editingId === null && (
            <button
              onClick={startNew}
              className="inline-flex items-center gap-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold"
            >
              <Plus className="w-4 h-4" /> Novo produto
            </button>
          )}
        </div>

        {editingId !== null && (
          <div className="border border-border rounded-xl p-4 mb-6 space-y-4 bg-background">
            <h3 className="font-semibold">
              {editingId === "new" ? "Novo produto" : "Editar produto"}
            </h3>

            <div className="grid sm:grid-cols-2 gap-3">
              <input
                value={edit.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setEdit({
                    ...edit,
                    name,
                    slug: editingId === "new" && !edit.slug ? slugify(name) : edit.slug,
                  });
                }}
                placeholder="Nome do produto *"
                className="rounded-md border border-input bg-card px-3 py-2 text-sm"
              />
              <input
                value={edit.slug}
                onChange={(e) => setEdit({ ...edit, slug: slugify(e.target.value) })}
                placeholder="slug (URL)"
                className="rounded-md border border-input bg-card px-3 py-2 text-sm font-mono"
              />
            </div>
            <textarea
              value={edit.description}
              onChange={(e) => setEdit({ ...edit, description: e.target.value })}
              placeholder="Descrição"
              rows={3}
              className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
            />
            <div>
              <input
                value={edit.category}
                onChange={(e) => setEdit({ ...edit, category: e.target.value })}
                placeholder="Categoria (ex: Cartões, Banners, Panfletos)"
                list="shop-categories-list"
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
              />
              <datalist id="shop-categories-list">
                {Array.from(
                  new Set(
                    products
                      .map((p) => (p as any).category)
                      .filter((c): c is string => !!c && c.trim().length > 0),
                  ),
                ).map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="flex gap-3 items-center">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={edit.active}
                  onChange={(e) => setEdit({ ...edit, active: e.target.checked })}
                />
                Ativo
              </label>
              <label className="flex items-center gap-2 text-sm">
                Ordem:
                <input
                  type="number"
                  value={edit.sort_order}
                  onChange={(e) => setEdit({ ...edit, sort_order: Number(e.target.value) || 0 })}
                  className="w-20 rounded-md border border-input bg-card px-2 py-1 text-sm"
                />
              </label>
            </div>

            {/* Base pricing */}
            <div className="border-t border-border pt-4">
              <h4 className="font-medium text-sm mb-2">Preço base (usado quando não há variações)</h4>
              <div className="flex gap-3 items-center mb-2">
                <select
                  value={edit.base_price_mode}
                  onChange={(e) => setEdit({ ...edit, base_price_mode: e.target.value as PriceMode })}
                  className="rounded-md border border-input bg-card px-3 py-2 text-sm"
                >
                  <option value="unit">Por unidade</option>
                  <option value="area">Por m²</option>
                  <option value="fixed">Preço fixo</option>
                </select>
              </div>
              {renderPriceFields(
                edit.base_price_mode,
                {
                  unit: edit.base_unit_price,
                  area: edit.base_area_price_per_m2,
                  fixed: edit.base_fixed_price,
                  min: edit.base_min_price,
                },
                (patch) =>
                  setEdit({
                    ...edit,
                    base_unit_price: patch.unit_price ?? edit.base_unit_price,
                    base_area_price_per_m2: patch.area_price_per_m2 ?? edit.base_area_price_per_m2,
                    base_fixed_price: patch.fixed_price ?? edit.base_fixed_price,
                    base_min_price: patch.min_price ?? edit.base_min_price,
                  }),
              )}
            </div>

            {/* Images */}
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">Fotos ({edit.images.length}/{MAX_IMAGES})</h4>
                <div className="flex gap-2">
                  <label className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-3 py-1.5 rounded-md cursor-pointer hover:opacity-90">
                    <Upload className="w-3 h-3" /> Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadImage(f);
                        e.target.value = "";
                      }}
                      disabled={edit.images.length >= MAX_IMAGES}
                    />
                  </label>
                  <button
                    onClick={addImageUrl}
                    disabled={edit.images.length >= MAX_IMAGES}
                    className="text-xs bg-muted text-foreground px-3 py-1.5 rounded-md hover:opacity-90 disabled:opacity-50"
                  >
                    + URL
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {edit.images.map((img, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <button
                      onClick={() => setPrimary(idx)}
                      title="Definir como principal (preview ao compartilhar)"
                      className={img.is_primary ? "text-yellow-500" : "text-muted-foreground"}
                    >
                      <Star className="w-4 h-4" fill={img.is_primary ? "currentColor" : "none"} />
                    </button>
                    {img.image_url && (
                      <img src={img.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                    )}
                    <input
                      value={img.image_url}
                      onChange={(e) => updateImage(idx, { image_url: e.target.value })}
                      placeholder="URL da imagem"
                      className="flex-1 rounded-md border border-input bg-card px-2 py-1 text-xs"
                    />
                    <button onClick={() => removeImage(idx)} className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {edit.images.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhuma foto adicionada.</p>
                )}
              </div>
            </div>

            {/* Variations */}
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">
                  Variações ({edit.variations.length}/{MAX_VARIATIONS})
                </h4>
                <button
                  onClick={addVariation}
                  disabled={edit.variations.length >= MAX_VARIATIONS}
                  className="text-xs bg-secondary text-secondary-foreground px-3 py-1.5 rounded-md disabled:opacity-50"
                >
                  + Variação
                </button>
              </div>
              <div className="space-y-3">
                {edit.variations.map((v, idx) => (
                  <div key={idx} className="border border-border rounded-lg p-3 space-y-2">
                    <div className="flex gap-2 items-center">
                      <input
                        value={v.label}
                        onChange={(e) => updateVar(idx, { label: e.target.value })}
                        placeholder="Nome da variação (ex: 4x0 frente)"
                        className="flex-1 rounded-md border border-input bg-card px-2 py-1 text-sm"
                      />
                      <select
                        value={v.price_mode}
                        onChange={(e) => updateVar(idx, { price_mode: e.target.value as PriceMode })}
                        className="rounded-md border border-input bg-card px-2 py-1 text-sm"
                      >
                        <option value="unit">Por unidade</option>
                        <option value="area">Por m²</option>
                        <option value="fixed">Fixo</option>
                      </select>
                      <button onClick={() => removeVar(idx)} className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {renderPriceFields(
                      v.price_mode,
                      { unit: v.unit_price, area: v.area_price_per_m2, fixed: v.fixed_price, min: v.min_price },
                      (patch) => updateVar(idx, patch),
                    )}
                  </div>
                ))}
                {edit.variations.length === 0 && (
                  <p className="text-xs text-muted-foreground">Sem variações — usa o preço base.</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-border">
              <button onClick={cancel} className="px-4 py-2 rounded-lg border border-border text-sm">
                <X className="w-4 h-4 inline mr-1" /> Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground text-sm">Carregando...</p>
        ) : products.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum produto cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {products.map((p) => {
              const primary = p.images.find((i) => i.is_primary)?.image_url || p.images[0]?.image_url;
              return (
                <div key={p.id} className="flex items-center gap-3 border border-border rounded-lg p-3">
                  {primary ? (
                    <img src={primary} alt="" className="w-12 h-12 rounded object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded bg-muted" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {p.name} {!p.active && <span className="text-xs text-muted-foreground">(inativo)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      /produto/{p.slug} · {p.images.length} foto(s) · {p.variations.length} variação(ões)
                    </p>
                  </div>
                  <button
                    onClick={() => copyLink(p.slug)}
                    title="Copiar link compartilhável"
                    className="text-muted-foreground hover:text-primary p-2"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => startEdit(p)}
                    className="text-xs bg-secondary text-secondary-foreground px-3 py-1.5 rounded-md"
                  >
                    Editar
                  </button>
                  <button onClick={() => removeProduct(p.id!)} className="text-destructive p-2">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopProductsAdmin;