"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "@/lib/use-toast";
import { useTenantTimezone } from "@/components/tenant-timezone-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/utils";
import { SortableHeader } from "@/components/ui/sortable-header";
import {
  ShoppingBag, Plus, Pencil, Trash2, Package, GlassWater,
  ClipboardList, ShoppingCart, X, Camera, Search,
  ChevronDown, ChevronUp, BarChart2, ScrollText, AlertCircle, MoreVertical, Tag,
} from "lucide-react";

type SizeStock = { size: string; stock: number };

type ShopItem = {
  id: string;
  name: string;
  category: "DRINKS" | "MERCHANDISE";
  sellingPrice: number;
  costPrice: number;
  stock: number;
  photoUrl: string | null;
  isActive: boolean;
  availableSizes: string; // JSON array of custom size strings beyond XS/S/M/L/XL
  sizeStocks: SizeStock[];
};

type CartItem = { item: ShopItem; quantity: number; selectedSize?: string; specialPrice?: number; specialPriceNote?: string };

type Sale = {
  id: string;
  buyerName: string | null;
  buyerMemberId: string | null;
  buyerEmployeeId: string | null;
  buyerMember: { firstName: string; lastName: string; memberNumber: string | null } | null;
  buyerEmployee: { firstName: string; lastName: string } | null;
  staffName: string;
  paymentMode: string;
  receiptUrl: string | null;
  needsReceipt: boolean;
  total: number;
  notes: string | null;
  createdAt: string;
  items: { quantity: number; priceAtSale: number; shopItem: { name: string; category: string } }[];
};

type InventoryLog = {
  id: string;
  type: "COUNT" | "ADJUSTMENT";
  quantity: number;
  reason: string | null;
  staffName: string;
  createdAt: string;
  shopItem: { name: string; category: string };
};

type BuyerResult = {
  id: string;
  type: "member" | "employee";
  name: string;
  sub: string;
};

const PAYMENT_MODES = ["Cash", "Credit Card", "Bank Transfer", "eWallet", "Class Pass"];
const PAYMENT_SUB: Record<string, string[]> = {
  "Bank Transfer": ["BDO", "BPI"],
  "eWallet": ["GCash", "Maya"],
};

function parsePmMode(full: string) {
  for (const mode of PAYMENT_MODES) {
    if (full.startsWith(mode)) {
      const sub = full.slice(mode.length).replace(/^[\s\-]+/, "");
      return { mode, sub: sub || "" };
    }
  }
  return { mode: full, sub: "" };
}

export function ShopClient({
  initialItems,
  isAdmin,
  staffId,
  staffName,
}: {
  initialItems: ShopItem[];
  isAdmin: boolean;
  staffId: string;
  staffName: string;
}) {
  const timeZone = useTenantTimezone();
  const [items, setItems] = useState<ShopItem[]>(initialItems);
  const [activeTab, setActiveTab] = useState("sales");

  // --- Inventory tab state ---
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
  const [itemForm, setItemForm] = useState({ name: "", category: "DRINKS" as "DRINKS" | "MERCHANDISE", sellingPrice: "", costPrice: "", stock: "" });
  const [itemPhoto, setItemPhoto] = useState<File | null>(null);
  const [itemPhotoPreview, setItemPhotoPreview] = useState<string | null>(null);
  const [savingItem, setSavingItem] = useState(false);

  const [showInventoryDialog, setShowInventoryDialog] = useState(false);
  const [inventoryItem, setInventoryItem] = useState<ShopItem | null>(null);
  const [invType, setInvType] = useState<"COUNT" | "ADJUSTMENT">("COUNT");
  const [invQty, setInvQty] = useState("");
  const [invReason, setInvReason] = useState("");
  const [invSize, setInvSize] = useState("");
  const [invOtherText, setInvOtherText] = useState("");
  const [savingInv, setSavingInv] = useState(false);

  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [invLogsSortDir, setInvLogsSortDir] = useState<"asc" | "desc">("desc");
  const [loadingLogs, setLoadingLogs] = useState(false);

  // --- Sales tab state ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const [buyerSearch, setBuyerSearch] = useState("");
  const [buyerResults, setBuyerResults] = useState<BuyerResult[]>([]);
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerResult | null>(null);
  const [walkInName, setWalkInName] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [paymentSubMode, setPaymentSubMode] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptStatus, setReceiptStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [saleNotes, setSaleNotes] = useState("");
  const [submittingSale, setSubmittingSale] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState<Record<string, boolean>>({ drinks: true, merch: false });
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [saleSuccess, setSaleSuccess] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  // Per-item size picker (merchandise items with sizes)
  const [sizePickerItem, setSizePickerItem] = useState<ShopItem | null>(null);
  const [sizePickerOther, setSizePickerOther] = useState("");

  function openSizePicker(item: ShopItem) {
    setSizePickerItem(item);
    setSizePickerOther("");
  }

  function confirmSizePicker(size: string) {
    if (!sizePickerItem) return;
    const effectiveSize = size === "OTHER" ? sizePickerOther.trim() : size;
    if (!effectiveSize) return;
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === sizePickerItem.id && c.selectedSize === effectiveSize);
      if (existing) {
        return prev.map((c) => c.item.id === sizePickerItem.id && c.selectedSize === effectiveSize
          ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { item: sizePickerItem, quantity: 1, selectedSize: effectiveSize }];
    });
    setSizePickerItem(null);
  }

  // Per-item special price
  const [itemSpecialPriceOpen, setItemSpecialPriceOpen] = useState<string | null>(null);
  const [itemSpecialInput, setItemSpecialInput] = useState("");
  const [itemSpecialReasons, setItemSpecialReasons] = useState<string[]>([]);
  const [itemSpecialOther, setItemSpecialOther] = useState("");

  const SPECIAL_PRICE_REASONS = [
    "Employee Price",
    "Family / Friend Discount",
    "Loyalty Discount",
    "Promotional Rate",
    "Complimentary",
    "Bundle Deal",
  ];

  // --- Sales report state ---
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesSortDir, setSalesSortDir] = useState<"asc" | "desc">("desc");
  const [loadingSales, setLoadingSales] = useState(false);
  const [reportFrom, setReportFrom] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toLocaleDateString("en-CA", { timeZone });
  });
  const [reportTo, setReportTo] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone }));
  const [reportCategory, setReportCategory] = useState("ALL");
  const [reportLoaded, setReportLoaded] = useState(false);

  // --- Log tab state ---
  const [logSales, setLogSales] = useState<Sale[]>([]);
  const [logSalesSortDir, setLogSalesSortDir] = useState<"asc" | "desc">("desc");
  const [loadingLog, setLoadingLog] = useState(false);
  const [logLoaded, setLogLoaded] = useState(false);
  const [logFrom, setLogFrom] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone }));
  const [logTo, setLogTo] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone }));

  // Add Stock dialog
  const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL"];
  const [restockItem, setRestockItem] = useState<ShopItem | null>(null);
  const [restockForm, setRestockForm] = useState({ qty: "", costPerUnit: "", supplier: "", notes: "", date: new Date().toLocaleDateString("en-CA", { timeZone }) });
  const [restockSize, setRestockSize] = useState<string>(""); // single selected size
  const [restockOtherText, setRestockOtherText] = useState("");
  const [savingRestock, setSavingRestock] = useState(false);

  function openRestock(item: ShopItem) {
    setRestockItem(item);
    setRestockForm({ qty: "", costPerUnit: "", supplier: "", notes: "", date: new Date().toLocaleDateString("en-CA", { timeZone }) });
    setRestockSize("");
    setRestockOtherText("");
    setSavingRestock(false);
  }

  async function submitRestock() {
    if (!restockItem || !restockForm.qty) return;
    setSavingRestock(true);
    const effectiveSize = restockSize === "OTHER" ? restockOtherText.trim() : restockSize;
    try {
      const res = await fetch(`/api/shop/items/${restockItem.id}/restock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qty: parseInt(restockForm.qty),
          costPerUnit: parseFloat(restockForm.costPerUnit) || 0,
          supplier: restockForm.supplier || undefined,
          notes: restockForm.notes || undefined,
          date: restockForm.date,
          size: effectiveSize || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      const updated: ShopItem = await res.json();
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setRestockItem(null);
    } catch {
      alert("Failed to add stock.");
    } finally {
      setSavingRestock(false);
    }
  }

  // Edit sale dialog
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editPaymentMode, setEditPaymentMode] = useState("");
  const [editPaymentSub, setEditPaymentSub] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editBuyerSearch, setEditBuyerSearch] = useState("");
  const [editBuyerResults, setEditBuyerResults] = useState<BuyerResult[]>([]);
  const [editSelectedBuyer, setEditSelectedBuyer] = useState<BuyerResult | null>(null);
  const [editWalkInName, setEditWalkInName] = useState("");
  const [editReceiptFile, setEditReceiptFile] = useState<File | null>(null);
  const [editReceiptPreview, setEditReceiptPreview] = useState<string | null>(null);
  const [needsReceipt, setNeedsReceipt] = useState(true);
  const [editNeedsReceipt, setEditNeedsReceipt] = useState(true);
  const [savingSale, setSavingSale] = useState(false);
  const editReceiptRef = useRef<HTMLInputElement>(null);

  // Auto-load today's log on mount and refresh every hour
  useEffect(() => {
    loadLog();
    const interval = setInterval(() => {
      const today = new Date().toLocaleDateString("en-CA", { timeZone });
      setLogFrom(today);
      setLogTo(today);
      loadLog();
    }, 60 * 60 * 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── helpers ────────────────────────────────────────────────────────────────

  function openAddItem() {
    setEditingItem(null);
    setItemForm({ name: "", category: "DRINKS", sellingPrice: "", costPrice: "", stock: "" });
    setItemPhoto(null);
    setItemPhotoPreview(null);
    setShowItemDialog(true);
  }

  function openEditItem(item: ShopItem) {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      category: item.category,
      sellingPrice: String(item.sellingPrice),
      costPrice: String(item.costPrice),
      stock: String(item.stock),
    });
    setItemPhoto(null);
    setItemPhotoPreview(item.photoUrl);
    setShowItemDialog(true);
  }

  function resizeToDataUrl(file: File, maxPx = 400): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  async function saveItem() {
    setSavingItem(true);
    try {
      let photoUrl: string | undefined = editingItem?.photoUrl ?? undefined;

      if (itemPhoto) {
        photoUrl = await resizeToDataUrl(itemPhoto);
      }

      const body = {
        name: itemForm.name,
        category: itemForm.category,
        sellingPrice: parseFloat(itemForm.sellingPrice) || 0,
        costPrice: parseFloat(itemForm.costPrice) || 0,
        stock: parseInt(itemForm.stock) || 0,
        photoUrl,
      };

      const url = editingItem ? `/api/shop/items/${editingItem.id}` : "/api/shop/items";
      const method = editingItem ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? `HTTP ${res.status}`);
      }
      const saved: ShopItem = await res.json();

      setItems((prev) =>
        editingItem ? prev.map((i) => (i.id === saved.id ? saved : i)) : [...prev, saved]
      );
      setShowItemDialog(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to save item", description: e?.message });
    } finally {
      setSavingItem(false);
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("Archive this item? It won't appear in new sales but history is kept.")) return;
    await fetch(`/api/shop/items/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function openInventory(item: ShopItem) {
    setInventoryItem(item);
    setInvType("COUNT");
    setInvQty("");
    setInvReason("");
    setInvSize("");
    setInvOtherText("");
    setShowInventoryDialog(true);
  }

  async function saveInventory() {
    if (!inventoryItem) return;
    setSavingInv(true);
    const effectiveSize = invSize === "OTHER" ? invOtherText.trim() : invSize;
    try {
      const qty = parseInt(invQty);
      if (isNaN(qty)) { alert("Enter a valid quantity."); return; }

      const res = await fetch("/api/shop/inventory-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopItemId: inventoryItem.id,
          type: invType,
          quantity: qty,
          reason: invReason || undefined,
          size: effectiveSize || undefined,
        }),
      });
      if (!res.ok) throw new Error();

      // Refresh the item so size stocks + total are up to date
      const refreshed = await fetch("/api/shop/items").then((r) => r.json()).catch(() => null);
      if (refreshed) setItems(refreshed);
      setShowInventoryDialog(false);
    } catch {
      alert("Failed to save inventory.");
    } finally {
      setSavingInv(false);
    }
  }

  async function loadLogs() {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/shop/inventory-log");
      const data = await res.json();
      setLogs(data);
      setShowLogsDialog(true);
    } finally {
      setLoadingLogs(false);
    }
  }

  // ── cart ───────────────────────────────────────────────────────────────────

  function addToCart(item: ShopItem) {
    const hasSizes = item.category === "MERCHANDISE" &&
      ((item.sizeStocks?.length ?? 0) > 0 || JSON.parse(item.availableSizes ?? "[]").length > 0);
    if (hasSizes) {
      openSizePicker(item);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id && !c.selectedSize);
      if (existing) return prev.map((c) => c.item.id === item.id && !c.selectedSize ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { item, quantity: 1 }];
    });
  }

  function updateCartQty(itemId: string, qty: number, selectedSize?: string) {
    if (qty <= 0) {
      setCart((prev) => prev.filter((c) => !(c.item.id === itemId && c.selectedSize === selectedSize)));
      if (itemSpecialPriceOpen === itemId) {
        setItemSpecialPriceOpen(null);
        setItemSpecialInput("");
        setItemSpecialReasons([]);
        setItemSpecialOther("");
      }
    } else {
      setCart((prev) => prev.map((c) =>
        c.item.id === itemId && c.selectedSize === selectedSize ? { ...c, quantity: qty } : c
      ));
    }
  }

  const cartTotal = cart.reduce((sum, c) => sum + (c.specialPrice ?? c.item.sellingPrice) * c.quantity, 0);

  function applyItemSpecialPrice(cartKey: string, price: number, note: string) {
    const [itemId, size] = cartKey.split("-");
    setCart((prev) => prev.map((c) =>
      c.item.id === itemId && (c.selectedSize ?? "") === (size ?? "")
        ? { ...c, specialPrice: price, specialPriceNote: note } : c
    ));
  }
  function clearItemSpecialPrice(cartKey: string) {
    const [itemId, size] = cartKey.split("-");
    setCart((prev) => prev.map((c) =>
      c.item.id === itemId && (c.selectedSize ?? "") === (size ?? "")
        ? { ...c, specialPrice: undefined, specialPriceNote: undefined } : c
    ));
  }

  // ── buyer search ───────────────────────────────────────────────────────────

  const searchBuyer = useCallback(async (q: string, setter: (r: BuyerResult[]) => void) => {
    if (q.length < 2) { setter([]); return; }
    try {
      const [mRes, eRes] = await Promise.all([
        fetch(`/api/members?q=${encodeURIComponent(q)}`),
        fetch(`/api/employees?q=${encodeURIComponent(q)}`),
      ]);
      const [members, employees] = await Promise.all([mRes.json(), eRes.json()]);
      setter([
        ...members.map((m: any) => ({ id: m.id, type: "member" as const, name: `${m.firstName} ${m.lastName}`, sub: m.memberNumber ?? m.user?.email ?? "Member" })),
        ...employees.map((e: any) => ({ id: e.id, type: "employee" as const, name: `${e.firstName} ${e.lastName}`, sub: e.employeeTypes?.[0] ?? "Employee" })),
      ]);
    } catch {}
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchBuyer(buyerSearch, setBuyerResults), 300);
    return () => clearTimeout(t);
  }, [buyerSearch, searchBuyer]);

  useEffect(() => {
    const t = setTimeout(() => searchBuyer(editBuyerSearch, setEditBuyerResults), 300);
    return () => clearTimeout(t);
  }, [editBuyerSearch, searchBuyer]);

  // ── submit sale ────────────────────────────────────────────────────────────

  async function submitSale() {
    if (cart.length === 0) return;
    if (!selectedBuyer && !walkInName.trim()) return;

    setSubmittingSale(true);
    try {
      let uploadedReceiptUrl: string | null = null;

      if (receiptFile) {
        setReceiptStatus("uploading");
        const fd = new FormData();
        fd.append("file", receiptFile);
        fd.append("memberId", selectedBuyer?.id ?? "walk-in");
        fd.append("lastName", selectedBuyer?.name ?? walkInName ?? "WalkIn");
        fd.append("sport", "Shop");
        fd.append("package", cart.map((c) => c.item.name).join(", "));
        fd.append("amount", String(cartTotal));
        fd.append("paymentMethod", paymentSubMode ? `${paymentMode}${paymentSubMode}` : paymentMode);
        const upRes = await fetch("/api/upload-receipt", { method: "POST", body: fd });
        if (upRes.ok) {
          const data = await upRes.json();
          uploadedReceiptUrl = data.link ?? null;
          setReceiptUrl(uploadedReceiptUrl);
          setReceiptStatus("done");
        } else {
          setReceiptStatus("error");
        }
      }

      const fullPaymentMode = paymentSubMode ? `${paymentMode} - ${paymentSubMode}` : paymentMode;

      const specialNotes = cart
        .filter((c) => c.specialPriceNote)
        .map((c) => `${c.item.name}: ${c.specialPriceNote}`)
        .join("; ");

      const body: any = {
        paymentMode: fullPaymentMode || undefined,
        receiptUrl: uploadedReceiptUrl ?? undefined,
        needsReceipt,
        notes: [specialNotes, saleNotes].filter(Boolean).join(" | ") || undefined,
        items: cart.map((c) => ({ shopItemId: c.item.id, quantity: c.quantity, priceAtSale: c.specialPrice ?? c.item.sellingPrice, selectedSize: c.selectedSize ?? undefined })),
      };

      if (selectedBuyer?.type === "member") body.buyerMemberId = selectedBuyer.id;
      else if (selectedBuyer?.type === "employee") body.buyerEmployeeId = selectedBuyer.id;
      else if (walkInName) body.buyerName = walkInName;

      const res = await fetch("/api/shop/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? "Failed to record sale.");
        return;
      }

      setItems((prev) =>
        prev.map((i) => {
          const cartEntry = cart.find((c) => c.item.id === i.id);
          return cartEntry ? { ...i, stock: i.stock - cartEntry.quantity } : i;
        })
      );

      setCart([]);
      setNeedsReceipt(true);
      setSelectedBuyer(null);
      setBuyerSearch("");
      setWalkInName("");
      setPaymentMode("");
      setPaymentSubMode("");
      setReceiptFile(null);
      setReceiptPreview(null);
      setReceiptStatus("idle");
      setReceiptUrl(null);
      setSaleNotes("");
      setSaleSuccess(true);
      setCartSheetOpen(false);
      setTimeout(() => setSaleSuccess(false), 3000);
      // MED-4: re-fetch items so stock counts reflect the actual server state
      fetch("/api/shop/items").then((r) => r.json()).then((data) => setItems(data)).catch(() => {});
    } finally {
      setSubmittingSale(false);
    }
  }

  // ── load sales report ──────────────────────────────────────────────────────

  async function loadSales() {
    setLoadingSales(true);
    try {
      const params = new URLSearchParams({
        from: new Date(reportFrom).toISOString(),
        to: new Date(reportTo + "T23:59:59").toISOString(),
        ...(reportCategory !== "ALL" ? { category: reportCategory } : {}),
      });
      const res = await fetch(`/api/shop/sales?${params}`);
      setSales(await res.json());
      setReportLoaded(true);
    } finally {
      setLoadingSales(false);
    }
  }

  // ── load log ───────────────────────────────────────────────────────────────

  async function loadLog() {
    setLoadingLog(true);
    try {
      const params = new URLSearchParams({
        from: new Date(logFrom).toISOString(),
        to: new Date(logTo + "T23:59:59").toISOString(),
      });
      const res = await fetch(`/api/shop/sales?${params}`);
      setLogSales(await res.json());
      setLogLoaded(true);
    } finally {
      setLoadingLog(false);
    }
  }

  // ── open edit sale dialog ──────────────────────────────────────────────────

  function openEditSale(sale: Sale) {
    const { mode, sub } = parsePmMode(sale.paymentMode);
    setEditingSale(sale);
    setEditPaymentMode(mode);
    setEditPaymentSub(sub);
    setEditNotes(sale.notes ?? "");
    setEditReceiptFile(null);
    setEditReceiptPreview(sale.receiptUrl);
    setEditNeedsReceipt(sale.needsReceipt ?? true);
    setEditBuyerSearch("");
    setEditBuyerResults([]);

    if (sale.buyerMember) {
      setEditSelectedBuyer({
        id: sale.buyerMemberId!,
        type: "member",
        name: `${sale.buyerMember.firstName} ${sale.buyerMember.lastName}`,
        sub: sale.buyerMember.memberNumber ?? "Member",
      });
      setEditWalkInName("");
    } else if (sale.buyerEmployee) {
      setEditSelectedBuyer({
        id: sale.buyerEmployeeId!,
        type: "employee",
        name: `${sale.buyerEmployee.firstName} ${sale.buyerEmployee.lastName}`,
        sub: "Employee",
      });
      setEditWalkInName("");
    } else {
      setEditSelectedBuyer(null);
      setEditWalkInName(sale.buyerName ?? "");
    }
  }

  async function saveSaleEdit() {
    if (!editingSale) return;
    if (!editPaymentMode) { alert("Select a payment mode."); return; }
    if (PAYMENT_SUB[editPaymentMode] && !editPaymentSub) { alert("Select a payment sub-mode."); return; }

    setSavingSale(true);
    try {
      let uploadedReceiptUrl: string | null | undefined = undefined;

      if (editReceiptFile) {
        const buyerLabel = editSelectedBuyer?.name ?? editWalkInName ?? "WalkIn";
        const fd = new FormData();
        fd.append("file", editReceiptFile);
        fd.append("memberId", editSelectedBuyer?.id ?? "walk-in");
        fd.append("lastName", buyerLabel);
        fd.append("sport", "Shop");
        fd.append("package", editingSale.items.map((i) => i.shopItem.name).join(", "));
        fd.append("amount", String(editingSale.total));
        fd.append("paymentMethod", editPaymentSub ? `${editPaymentMode}${editPaymentSub}` : editPaymentMode);
        const upRes = await fetch("/api/upload-receipt", { method: "POST", body: fd });
        if (upRes.ok) {
          const data = await upRes.json();
          uploadedReceiptUrl = data.link ?? null;
        }
      }

      const fullPaymentMode = editPaymentSub ? `${editPaymentMode} - ${editPaymentSub}` : editPaymentMode;

      const body: any = {
        paymentMode: fullPaymentMode,
        needsReceipt: editNeedsReceipt,
        notes: editNotes || null,
        ...(uploadedReceiptUrl !== undefined ? { receiptUrl: uploadedReceiptUrl } : {}),
        buyerMemberId: null,
        buyerEmployeeId: null,
        buyerName: null,
      };

      if (editSelectedBuyer?.type === "member") body.buyerMemberId = editSelectedBuyer.id;
      else if (editSelectedBuyer?.type === "employee") body.buyerEmployeeId = editSelectedBuyer.id;
      else if (editWalkInName) body.buyerName = editWalkInName;

      const res = await fetch(`/api/shop/sales/${editingSale.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const updated: Sale = await res.json();

      setLogSales((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setSales((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      // Remove from incomplete list if now complete
      setIncompleteSales((prev) => {
        const still = prev.map((s) => (s.id === updated.id ? updated : s));
        return still.filter((s) => !s.paymentMode || (!s.receiptUrl && (s.needsReceipt ?? true)));
      });
      setEditingSale(null);
    } catch {
      alert("Failed to save changes.");
    } finally {
      setSavingSale(false);
    }
  }

  // ── log filter ─────────────────────────────────────────────────────────────
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [incompleteSales, setIncompleteSales] = useState<Sale[]>([]);
  const [loadingIncomplete, setLoadingIncomplete] = useState(false);

  async function toggleIncomplete() {
    if (showIncompleteOnly) { setShowIncompleteOnly(false); return; }
    setLoadingIncomplete(true);
    try {
      const res = await fetch("/api/shop/sales?incomplete=true");
      setIncompleteSales(await res.json());
      setShowIncompleteOnly(true);
    } finally {
      setLoadingIncomplete(false);
    }
  }

  // ── derived for report ─────────────────────────────────────────────────────

  const reportTotal = sales.reduce((s, sale) => s + sale.total, 0);
  const itemBreakdown = sales
    .flatMap((s) => s.items.map((i) => ({ name: i.shopItem.name, category: i.shopItem.category, qty: i.quantity, rev: i.priceAtSale * i.quantity })))
    .reduce<Record<string, { qty: number; rev: number; category: string }>>((acc, i) => {
      if (!acc[i.name]) acc[i.name] = { qty: 0, rev: 0, category: i.category };
      acc[i.name].qty += i.qty;
      acc[i.name].rev += i.rev;
      return acc;
    }, {});
  const categoryBreakdown = sales
    .flatMap((s) => s.items.map((i) => ({ category: i.shopItem.category, rev: i.priceAtSale * i.quantity })))
    .reduce<Record<string, number>>((acc, i) => { acc[i.category] = (acc[i.category] ?? 0) + i.rev; return acc; }, {});

  const drinkItems = items.filter((i) => i.category === "DRINKS");
  const merchItems = items.filter((i) => i.category === "MERCHANDISE");

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <ShoppingBag className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Store</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="sales" className="gap-2"><ShoppingCart className="h-4 w-4" />New Sale</TabsTrigger>
          <TabsTrigger value="inventory" className="gap-2"><Package className="h-4 w-4" />Inventory</TabsTrigger>
          <TabsTrigger value="report" className="gap-2"><BarChart2 className="h-4 w-4" />Sales Report</TabsTrigger>
          <TabsTrigger value="log" className="gap-2"><ScrollText className="h-4 w-4" />Log</TabsTrigger>
        </TabsList>

        {/* ── INVENTORY TAB ─────────────────────────────────────────────── */}
        <TabsContent value="inventory" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{items.length} item{items.length !== 1 ? "s" : ""} in catalog</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadLogs} disabled={loadingLogs}>
                <ClipboardList className="h-4 w-4 mr-1" />Inventory Logs
              </Button>
              <Button size="sm" onClick={openAddItem}>
                <Plus className="h-4 w-4 mr-1" />Add Item
              </Button>
            </div>
          </div>

          {[{ label: "Drinks", icon: GlassWater, list: drinkItems }, { label: "Merchandise", icon: Package, list: merchItems }].map(({ label, icon: Icon, list }) => (
            <div key={label}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">{label}</h2>
                <Badge variant="secondary">{list.length}</Badge>
              </div>
              {list.length === 0 ? (
                <p className="text-sm text-muted-foreground pl-6">No {label.toLowerCase()} added yet.</p>
              ) : (
                <div className="rounded-md border divide-y">
                  {list.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 px-3 py-3">
                      {item.photoUrl ? (
                        <img src={item.photoUrl} alt={item.name} className="h-10 w-10 rounded object-cover shrink-0" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                          {item.category === "DRINKS" ? <GlassWater className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(item.sellingPrice)}</p>
                        {(item.sizeStocks?.length ?? 0) > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.sizeStocks.filter((s) => s.stock > 0).map((s) => (
                              <span key={s.size} className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
                                {s.size}:{s.stock}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className={`text-sm font-bold shrink-0 w-8 text-right ${item.stock <= 3 ? "text-red-600" : "text-green-700"}`}>{item.stock}</span>
                      <Button size="sm" variant="outline" onClick={() => openRestock(item)} title="Add stock" className="shrink-0">
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost" className="shrink-0">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openInventory(item)}>
                            <ClipboardList className="h-4 w-4 mr-2" />Adjust Stock
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditItem(item)}>
                            <Pencil className="h-4 w-4 mr-2" />Edit Item
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteItem(item.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </TabsContent>

        {/* ── NEW SALE TAB ──────────────────────────────────────────────── */}
        <TabsContent value="sales" className="mt-4">
          {saleSuccess && (
            <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm font-medium">
              ✓ Sale recorded successfully!
            </div>
          )}

          {/* ── DESKTOP: side-by-side ── */}
          <div className="hidden lg:grid lg:grid-cols-2 gap-6">
            {/* Items */}
            <div className="space-y-2">
              <h2 className="font-semibold">Select Items</h2>
              {([
                { key: "drinks", label: "Drinks", icon: GlassWater, list: drinkItems },
                { key: "merch", label: "Merchandise", icon: Package, list: merchItems },
              ] as const).map(({ key, label, icon: Icon, list }) => {
                const open = categoryOpen[key];
                return (
                  <div key={key} className="rounded-lg border overflow-hidden">
                    <button type="button" onClick={() => setCategoryOpen((prev) => ({ ...prev, [key]: !prev[key] }))}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/40 hover:bg-muted/70 transition-colors">
                      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" />{label}
                        <span className="ml-1 text-[10px] font-normal normal-case tracking-normal">({list.length})</span>
                      </span>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                    {open && (
                      <div className="p-2 grid grid-cols-3 gap-2">
                        {list.map((item) => (
                          <button key={item.id} onClick={() => addToCart(item)} disabled={item.stock === 0}
                            className="flex flex-col items-center gap-1 p-3 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-left">
                            {item.photoUrl ? <img src={item.photoUrl} alt={item.name} className="h-12 w-12 rounded object-cover" /> : (
                              <div className="h-12 w-12 rounded bg-muted flex items-center justify-center"><Icon className="h-5 w-5 text-muted-foreground" /></div>
                            )}
                            <span className="text-xs font-medium text-center leading-tight">{item.name}</span>
                            <span className="text-xs text-primary font-semibold">{formatCurrency(item.sellingPrice)}</span>
                            <span className={`text-[10px] ${item.stock <= 3 ? "text-red-500" : "text-muted-foreground"}`}>{item.stock} left</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Cart + checkout */}
            <div className="space-y-4">
              <h2 className="font-semibold">Cart</h2>
              {cart.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Tap items on the left to add them to the cart.</div>
              ) : (
                <div className="rounded-lg border divide-y">
                  {cart.map((c, idx) => {
                    const effectivePrice = c.specialPrice ?? c.item.sellingPrice;
                    const cartKey = `${c.item.id}-${c.selectedSize ?? ""}`;
                    return (
                    <div key={cartKey} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{c.item.name}</span>
                        {c.selectedSize && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold">{c.selectedSize}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        title="Set special price"
                        onClick={() => { setItemSpecialPriceOpen(cartKey); setItemSpecialInput(String(c.specialPrice ?? c.item.sellingPrice)); setItemSpecialReasons([]); setItemSpecialOther(""); }}
                        className="shrink-0"
                      >
                        <Tag className={`h-4 w-4 transition-colors cursor-pointer ${c.specialPrice !== undefined ? "text-amber-500" : "text-muted-foreground hover:text-amber-500"}`} />
                      </button>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateCartQty(c.item.id, c.quantity - 1, c.selectedSize)}><ChevronDown className="h-3 w-3" /></Button>
                        <span className="w-6 text-center text-sm">{c.quantity}</span>
                        <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateCartQty(c.item.id, c.quantity + 1, c.selectedSize)} disabled={c.quantity >= c.item.stock}><ChevronUp className="h-3 w-3" /></Button>
                      </div>
                      <div className="w-20 text-right text-sm font-semibold">
                        {c.specialPrice !== undefined ? (
                          <span className="text-amber-600">{formatCurrency(effectivePrice * c.quantity)}</span>
                        ) : (
                          <span>{formatCurrency(effectivePrice * c.quantity)}</span>
                        )}
                      </div>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" onClick={() => updateCartQty(c.item.id, 0, c.selectedSize)}><X className="h-3 w-3" /></Button>
                    </div>
                    );
                  })}
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-lg">{formatCurrency(cartTotal)}</span>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Buyer</Label>
                {selectedBuyer ? (
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div><p className="text-sm font-medium">{selectedBuyer.name}</p><p className="text-xs text-muted-foreground capitalize">{selectedBuyer.type} · {selectedBuyer.sub}</p></div>
                    <Button size="sm" variant="ghost" onClick={() => { setSelectedBuyer(null); setBuyerSearch(""); }}><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-9" placeholder="Search member or employee..." value={buyerSearch} onChange={(e) => setBuyerSearch(e.target.value)} />
                    </div>
                    {buyerResults.length > 0 && (
                      <div className="rounded-md border divide-y max-h-40 overflow-y-auto">
                        {buyerResults.map((r) => (
                          <button key={r.id} className="w-full text-left px-3 py-2 hover:bg-muted text-sm" onClick={() => { setSelectedBuyer(r); setBuyerSearch(""); setBuyerResults([]); }}>
                            <p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground capitalize">{r.type} · {r.sub}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2"><div className="h-px flex-1 bg-border" /><span className="text-xs text-muted-foreground">or walk-in</span><div className="h-px flex-1 bg-border" /></div>
                    <Input placeholder="Walk-in name (optional)" value={walkInName} onChange={(e) => setWalkInName(e.target.value)} />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <Select value={paymentMode} onValueChange={(v) => { setPaymentMode(v); setPaymentSubMode(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select payment mode..." /></SelectTrigger>
                  <SelectContent>{PAYMENT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
                {PAYMENT_SUB[paymentMode] && (
                  <Select value={paymentSubMode} onValueChange={setPaymentSubMode}>
                    <SelectTrigger><SelectValue placeholder={`Select ${paymentMode} method...`} /></SelectTrigger>
                    <SelectContent>{PAYMENT_SUB[paymentMode].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="needsReceiptCheck"
                    checked={needsReceipt}
                    onChange={(e) => setNeedsReceipt(e.target.checked)}
                    className="h-4 w-4 accent-primary cursor-pointer"
                  />
                  <label htmlFor="needsReceiptCheck" className="text-sm font-medium cursor-pointer select-none">Needs Receipt</label>
                </div>
                <Label>Receipt / Proof of Payment</Label>
                {!receiptPreview ? (
                  <label className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-4 cursor-pointer hover:border-primary transition-colors">
                    <Camera className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Tap to upload or take a photo</span>
                    <input type="file" accept="image/*" capture="environment" className="hidden" ref={receiptInputRef} onChange={(e) => { const f = e.target.files?.[0]; if (f) { setReceiptFile(f); setReceiptPreview(URL.createObjectURL(f)); setReceiptStatus("idle"); } }} />
                  </label>
                ) : (
                  <div className="relative rounded-lg overflow-hidden border">
                    <img src={receiptPreview} className="w-full max-h-40 object-cover" alt="receipt" />
                    <button className="absolute top-1 right-1 rounded-full bg-background/80 p-1 hover:bg-background" onClick={() => { setReceiptFile(null); setReceiptPreview(null); setReceiptStatus("idle"); if (receiptInputRef.current) receiptInputRef.current.value = ""; }}><X className="h-3 w-3" /></button>
                    {receiptStatus === "done" && <div className="absolute bottom-1 left-1 bg-green-600 text-white text-[10px] px-2 py-0.5 rounded">Uploaded</div>}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Input placeholder="Any notes about this sale..." value={saleNotes} onChange={(e) => setSaleNotes(e.target.value)} />
              </div>
              <Button className="w-full" disabled={cart.length === 0 || (!selectedBuyer && !walkInName.trim()) || submittingSale} onClick={submitSale}>
                {submittingSale ? "Processing..." : `Record Sale · ${formatCurrency(cartTotal)}`}
              </Button>
            </div>
          </div>

          {/* ── MOBILE: full-width item grid + floating cart bar + bottom sheet ── */}
          <div className="lg:hidden">
            {/* Item grid */}
            <div className="space-y-2 pb-24">
              {([
                { key: "drinks", label: "Drinks", icon: GlassWater, list: drinkItems },
                { key: "merch", label: "Merchandise", icon: Package, list: merchItems },
              ] as const).map(({ key, label, icon: Icon, list }) => {
                const open = categoryOpen[key];
                return (
                  <div key={key} className="rounded-lg border overflow-hidden">
                    <button type="button" onClick={() => setCategoryOpen((prev) => ({ ...prev, [key]: !prev[key] }))}
                      className="w-full flex items-center justify-between px-3 py-3 bg-muted/40 active:bg-muted/80 transition-colors">
                      <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        <Icon className="h-4 w-4" />{label}
                        <span className="text-xs font-normal normal-case tracking-normal">({list.length})</span>
                      </span>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                    {open && (
                      <div className="p-2 grid grid-cols-3 gap-2">
                        {list.map((item) => {
                          const inCart = cart.find((c) => c.item.id === item.id);
                          return (
                            <button key={item.id} onClick={() => addToCart(item)} disabled={item.stock === 0}
                              className={`relative flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 ${inCart ? "border-primary bg-primary/5" : "hover:border-primary hover:bg-primary/5"}`}>
                              {inCart && (
                                <span className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">{inCart.quantity}</span>
                              )}
                              {item.photoUrl ? <img src={item.photoUrl} alt={item.name} className="h-14 w-14 rounded object-cover" /> : (
                                <div className="h-14 w-14 rounded bg-muted flex items-center justify-center"><Icon className="h-6 w-6 text-muted-foreground" /></div>
                              )}
                              <span className="text-xs font-medium text-center leading-tight">{item.name}</span>
                              <span className="text-xs text-primary font-semibold">{formatCurrency(item.sellingPrice)}</span>
                              <span className={`text-[10px] ${item.stock <= 3 ? "text-red-500" : "text-muted-foreground"}`}>{item.stock} left</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Floating cart bar */}
            {cart.length > 0 && !cartSheetOpen && (
              <button
                onClick={() => setCartSheetOpen(true)}
                className="fixed bottom-4 left-4 right-4 z-40 flex items-center justify-between rounded-xl bg-primary text-primary-foreground px-5 py-4 shadow-lg active:opacity-90 transition-opacity"
              >
                <div className="flex items-center gap-3">
                  <span className="h-6 w-6 rounded-full bg-primary-foreground/20 text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {cart.reduce((s, c) => s + c.quantity, 0)}
                  </span>
                  <span className="text-sm font-medium">View Cart</span>
                </div>
                <span className="font-bold">{formatCurrency(cartTotal)}</span>
              </button>
            )}

            {/* Cart bottom sheet overlay */}
            {cartSheetOpen && (
              <div className="fixed inset-0 z-50 flex flex-col justify-end">
                <div className="absolute inset-0 bg-black/50" onClick={() => setCartSheetOpen(false)} />
                <div className="relative bg-background rounded-t-2xl max-h-[90vh] flex flex-col shadow-xl">
                  {/* Sheet handle */}
                  <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b shrink-0">
                    <div className="flex items-center gap-3">
                      <h2 className="font-bold text-lg">Cart</h2>
                      <span className="text-sm text-muted-foreground">{cart.reduce((s, c) => s + c.quantity, 0)} item{cart.reduce((s, c) => s + c.quantity, 0) !== 1 ? "s" : ""}</span>
                    </div>
                    <button onClick={() => setCartSheetOpen(false)} className="rounded-full p-1.5 hover:bg-muted">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="overflow-y-auto flex-1 px-4 py-4 space-y-5">
                    {/* Cart items */}
                    <div className="rounded-lg border divide-y">
                      {cart.map((c) => {
                        const effectivePrice = c.specialPrice ?? c.item.sellingPrice;
                        return (
                        <div key={c.item.id} className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span className="flex-1 text-sm font-medium leading-tight">
                              {c.item.name}
                              {c.selectedSize && (
                                <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold">{c.selectedSize}</span>
                              )}
                            </span>
                            <button
                              type="button"
                              title="Set special price"
                              onClick={() => { setItemSpecialPriceOpen(c.item.id); setItemSpecialInput(String(c.specialPrice ?? c.item.sellingPrice)); setItemSpecialReasons([]); setItemSpecialOther(""); }}
                            >
                              <Tag className={`h-4 w-4 transition-colors cursor-pointer ${c.specialPrice !== undefined ? "text-amber-500" : "text-muted-foreground"}`} />
                            </button>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => updateCartQty(c.item.id, c.quantity - 1)}
                                className="h-8 w-8 rounded-full border flex items-center justify-center active:bg-muted text-lg font-medium">−</button>
                              <span className="w-7 text-center text-sm font-semibold">{c.quantity}</span>
                              <button onClick={() => updateCartQty(c.item.id, c.quantity + 1)} disabled={c.quantity >= c.item.stock}
                                className="h-8 w-8 rounded-full border flex items-center justify-center active:bg-muted text-lg font-medium disabled:opacity-40">+</button>
                            </div>
                            <span className={`text-sm font-bold shrink-0 ${c.specialPrice !== undefined ? "text-amber-600" : ""}`}>{formatCurrency(effectivePrice * c.quantity)}</span>
                          </div>
                        </div>
                        );
                      })}
                      <div className="flex items-center justify-between px-3 py-3 bg-muted/30 rounded-b-lg">
                        <span className="font-bold">Total</span>
                        <span className="font-bold text-xl">{formatCurrency(cartTotal)}</span>
                      </div>
                    </div>

                    {/* Buyer */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Buyer</Label>
                      {selectedBuyer ? (
                        <div className="flex items-center justify-between rounded-xl border px-4 py-3">
                          <div><p className="text-sm font-medium">{selectedBuyer.name}</p><p className="text-xs text-muted-foreground capitalize">{selectedBuyer.type} · {selectedBuyer.sub}</p></div>
                          <button onClick={() => { setSelectedBuyer(null); setBuyerSearch(""); }} className="rounded-full p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input className="pl-9 h-11 rounded-xl" placeholder="Search member or employee..." value={buyerSearch} onChange={(e) => setBuyerSearch(e.target.value)} />
                          </div>
                          {buyerResults.length > 0 && (
                            <div className="rounded-xl border divide-y max-h-40 overflow-y-auto">
                              {buyerResults.map((r) => (
                                <button key={r.id} className="w-full text-left px-4 py-3 hover:bg-muted text-sm" onClick={() => { setSelectedBuyer(r); setBuyerSearch(""); setBuyerResults([]); }}>
                                  <p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground capitalize">{r.type} · {r.sub}</p>
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-2"><div className="h-px flex-1 bg-border" /><span className="text-xs text-muted-foreground">or walk-in</span><div className="h-px flex-1 bg-border" /></div>
                          <Input className="h-11 rounded-xl" placeholder="Walk-in name (optional)" value={walkInName} onChange={(e) => setWalkInName(e.target.value)} />
                        </div>
                      )}
                    </div>

                    {/* Payment */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Payment Mode <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
                      <Select value={paymentMode} onValueChange={(v) => { setPaymentMode(v); setPaymentSubMode(""); }}>
                        <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select payment mode..." /></SelectTrigger>
                        <SelectContent>{PAYMENT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                      {PAYMENT_SUB[paymentMode] && (
                        <Select value={paymentSubMode} onValueChange={setPaymentSubMode}>
                          <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder={`Select ${paymentMode} method...`} /></SelectTrigger>
                          <SelectContent>{PAYMENT_SUB[paymentMode].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                    </div>

                    {/* Receipt */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="needsReceiptCheckMobile"
                          checked={needsReceipt}
                          onChange={(e) => setNeedsReceipt(e.target.checked)}
                          className="h-4 w-4 accent-primary cursor-pointer"
                        />
                        <label htmlFor="needsReceiptCheckMobile" className="text-sm font-medium cursor-pointer select-none">Needs Receipt</label>
                      </div>
                      <Label className="text-sm font-semibold">Receipt <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
                      {!receiptPreview ? (
                        <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-5 cursor-pointer hover:border-primary transition-colors active:bg-muted/30">
                          <Camera className="h-6 w-6 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Tap to upload or take a photo</span>
                          <input type="file" accept="image/*" capture="environment" className="hidden" ref={receiptInputRef} onChange={(e) => { const f = e.target.files?.[0]; if (f) { setReceiptFile(f); setReceiptPreview(URL.createObjectURL(f)); setReceiptStatus("idle"); } }} />
                        </label>
                      ) : (
                        <div className="relative rounded-xl overflow-hidden border">
                          <img src={receiptPreview} className="w-full max-h-48 object-cover" alt="receipt" />
                          <button className="absolute top-2 right-2 rounded-full bg-background/90 p-1.5 shadow" onClick={() => { setReceiptFile(null); setReceiptPreview(null); setReceiptStatus("idle"); if (receiptInputRef.current) receiptInputRef.current.value = ""; }}><X className="h-4 w-4" /></button>
                          {receiptStatus === "done" && <div className="absolute bottom-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded-lg">Uploaded</div>}
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Notes <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
                      <Input className="h-11 rounded-xl" placeholder="Any notes about this sale..." value={saleNotes} onChange={(e) => setSaleNotes(e.target.value)} />
                    </div>
                  </div>

                  {/* Sticky record button */}
                  <div className="px-4 pb-6 pt-3 border-t shrink-0">
                    <Button className="w-full h-13 text-base rounded-xl" style={{ height: "52px" }}
                      disabled={cart.length === 0 || (!selectedBuyer && !walkInName.trim()) || submittingSale}
                      onClick={submitSale}>
                      {submittingSale ? "Processing..." : `Record Sale · ${formatCurrency(cartTotal)}`}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── SALES REPORT TAB ──────────────────────────────────────────── */}
        <TabsContent value="report" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} className="w-36" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} className="w-36" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={reportCategory} onValueChange={setReportCategory}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  <SelectItem value="DRINKS">Drinks</SelectItem>
                  <SelectItem value="MERCHANDISE">Merchandise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={loadSales} disabled={loadingSales}>{loadingSales ? "Loading..." : "Generate Report"}</Button>
          </div>

          {reportLoaded && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  <p className="text-xl font-bold mt-1">{formatCurrency(reportTotal)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">Transactions</p>
                  <p className="text-xl font-bold mt-1">{sales.length}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">Drinks Revenue</p>
                  <p className="text-xl font-bold mt-1">{formatCurrency(categoryBreakdown["DRINKS"] ?? 0)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">Merch Revenue</p>
                  <p className="text-xl font-bold mt-1">{formatCurrency(categoryBreakdown["MERCHANDISE"] ?? 0)}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Sales by Item</h3>
                {Object.keys(itemBreakdown).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sales in this period.</p>
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium">Item</th>
                          <th className="text-left px-4 py-2 font-medium">Category</th>
                          <th className="text-right px-4 py-2 font-medium">Units Sold</th>
                          <th className="text-right px-4 py-2 font-medium">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {Object.entries(itemBreakdown).sort((a, b) => b[1].rev - a[1].rev).map(([name, d]) => (
                          <tr key={name} className="hover:bg-muted/30">
                            <td className="px-4 py-2 font-medium">{name}</td>
                            <td className="px-4 py-2 text-muted-foreground capitalize">{d.category.toLowerCase()}</td>
                            <td className="px-4 py-2 text-right">{d.qty}</td>
                            <td className="px-4 py-2 text-right font-semibold">{formatCurrency(d.rev)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-2">Transactions</h3>
                {sales.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No transactions in this period.</p>
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium">
                            <SortableHeader label="Date" direction={salesSortDir} onClick={() => setSalesSortDir((d) => (d === "asc" ? "desc" : "asc"))} />
                          </th>
                          <th className="text-left px-4 py-2 font-medium">Buyer</th>
                          <th className="text-left px-4 py-2 font-medium">Items</th>
                          <th className="text-left px-4 py-2 font-medium">Payment</th>
                          <th className="text-left px-4 py-2 font-medium">Staff</th>
                          <th className="text-right px-4 py-2 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {[...sales].sort((a, b) => {
                          const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                          return salesSortDir === "asc" ? diff : -diff;
                        }).map((sale) => {
                          const buyer = sale.buyerMember ? `${sale.buyerMember.firstName} ${sale.buyerMember.lastName}` : sale.buyerEmployee ? `${sale.buyerEmployee.firstName} ${sale.buyerEmployee.lastName}` : sale.buyerName ?? "Walk-in";
                          return (
                            <tr key={sale.id} className="hover:bg-muted/30">
                              <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">{new Date(sale.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</td>
                              <td className="px-4 py-2 font-medium">{buyer}</td>
                              <td className="px-4 py-2 text-muted-foreground">{sale.items.map((i) => `${i.shopItem.name} ×${i.quantity}`).join(", ")}</td>
                              <td className="px-4 py-2">{sale.paymentMode}</td>
                              <td className="px-4 py-2 text-muted-foreground">{sale.staffName}</td>
                              <td className="px-4 py-2 text-right font-semibold">{formatCurrency(sale.total)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── LOG TAB ───────────────────────────────────────────────────── */}
        <TabsContent value="log" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input type="date" value={logFrom} onChange={(e) => setLogFrom(e.target.value)} className="w-36" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input type="date" value={logTo} onChange={(e) => setLogTo(e.target.value)} className="w-36" />
            </div>
            <Button onClick={loadLog} disabled={loadingLog}>{loadingLog ? "Loading..." : "Load"}</Button>
          </div>

          {logLoaded && (
            logSales.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales in this period.</p>
            ) : (
              <>
                {(() => {
                  const incomplete = logSales.filter((s) => !s.paymentMode || (!s.receiptUrl && (s.needsReceipt ?? true)));
                  if (incomplete.length === 0) return null;
                  return (
                    <div className="flex items-center gap-2 rounded-md border border-orange-300 bg-orange-50 px-4 py-2.5 text-sm text-orange-800">
                      <AlertCircle className="h-4 w-4 shrink-0 text-orange-500" />
                      <span className="flex-1"><strong>{incomplete.length}</strong> sale{incomplete.length !== 1 ? "s are" : " is"} missing payment info or receipt. Click <strong>Edit</strong> on the flagged rows to complete them.</span>
                      <Button
                        size="sm"
                        variant={showIncompleteOnly ? "default" : "outline"}
                        className="shrink-0 text-xs"
                        onClick={toggleIncomplete}
                        disabled={loadingIncomplete}
                      >
                        {loadingIncomplete ? "Loading..." : showIncompleteOnly ? "Show All" : `Show Incomplete (${incomplete.length})`}
                      </Button>
                    </div>
                  );
                })()}
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium whitespace-nowrap">
                          <SortableHeader label="Date" direction={logSalesSortDir} onClick={() => setLogSalesSortDir((d) => (d === "asc" ? "desc" : "asc"))} />
                        </th>
                        <th className="text-left px-4 py-2 font-medium">Buyer</th>
                        <th className="text-left px-4 py-2 font-medium">Items</th>
                        <th className="text-left px-4 py-2 font-medium whitespace-nowrap">Payment</th>
                        <th className="text-left px-4 py-2 font-medium">Staff</th>
                        <th className="text-left px-4 py-2 font-medium">Notes</th>
                        <th className="text-center px-4 py-2 font-medium">Receipt</th>
                        <th className="text-right px-4 py-2 font-medium">Total</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {[...(showIncompleteOnly ? incompleteSales : logSales)].sort((a, b) => {
                        const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                        return logSalesSortDir === "asc" ? diff : -diff;
                      }).map((sale) => {
                        const buyer = sale.buyerMember
                          ? `${sale.buyerMember.firstName} ${sale.buyerMember.lastName}`
                          : sale.buyerEmployee
                          ? `${sale.buyerEmployee.firstName} ${sale.buyerEmployee.lastName}`
                          : sale.buyerName ?? "Walk-in";
                        const missingPayment = !sale.paymentMode;
                        const missingReceipt = !sale.receiptUrl && (sale.needsReceipt ?? true);
                        const incomplete = missingPayment || missingReceipt;
                        return (
                          <tr key={sale.id} className={`hover:bg-muted/30 ${incomplete ? "bg-orange-50/60 border-l-2 border-l-orange-400" : ""}`}>
                            <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                              {new Date(sale.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                            </td>
                            <td className="px-4 py-3 font-medium">{buyer}</td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {sale.items.map((i) => `${i.shopItem.name} ×${i.quantity}`).join(", ")}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {missingPayment
                                ? <span className="inline-flex items-center gap-1 text-orange-600 font-medium text-xs"><AlertCircle className="h-3.5 w-3.5" />Missing</span>
                                : sale.paymentMode}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{sale.staffName}</td>
                            <td className="px-4 py-3 text-muted-foreground max-w-[160px] truncate">{sale.notes ?? "—"}</td>
                            <td className="px-4 py-3 text-center">
                              {sale.receiptUrl ? (
                                <a href={sale.receiptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded border px-2 py-0.5 text-xs hover:bg-muted">
                                  View
                                </a>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-orange-600 text-xs"><AlertCircle className="h-3.5 w-3.5" />Missing</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold">{formatCurrency(sale.total)}</td>
                            <td className="px-4 py-3">
                              <Button size="sm" variant={incomplete ? "default" : "outline"} onClick={() => openEditSale(sale)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )
          )}
        </TabsContent>
      </Tabs>

      {/* ── SIZE PICKER DIALOG ───────────────────────────────────────── */}
      <Dialog open={!!sizePickerItem} onOpenChange={(o) => { if (!o) setSizePickerItem(null); }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Select Size — {sizePickerItem?.name}</DialogTitle>
          </DialogHeader>
          {sizePickerItem && (() => {
            const customSizes: string[] = JSON.parse(sizePickerItem.availableSizes ?? "[]");
            const knownSizes = [...DEFAULT_SIZES, ...customSizes.filter((s) => !DEFAULT_SIZES.includes(s))];
            const stockedSizes = (sizePickerItem.sizeStocks ?? []).map((s) => s.size).filter((s) => !knownSizes.includes(s));
            const allOptions = [...knownSizes, ...stockedSizes];
            const hasPerSizeSetup = (sizePickerItem.sizeStocks?.length ?? 0) > 0;
            return (
              <div className="space-y-3 py-1">
                {!hasPerSizeSetup && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                    <span>No per-size stock set up. Use <strong>Add Stock</strong> and select a size to enable size-level stock tracking.</span>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {allOptions.map((size) => {
                    const sStock = (sizePickerItem.sizeStocks ?? []).find((s) => s.size === size)?.stock ?? null;
                    // If this item has any per-size stock tracking, a size with no record (null) means no stock
                    const hasPerSizeTracking = (sizePickerItem.sizeStocks?.length ?? 0) > 0;
                    const outOfStock = hasPerSizeTracking ? (sStock === null || sStock <= 0) : (sStock !== null && sStock <= 0);
                    return (
                      <button
                        key={size}
                        type="button"
                        disabled={outOfStock}
                        onClick={() => confirmSizePicker(size)}
                        className={`flex flex-col items-center justify-center py-3 rounded-lg border text-sm font-medium transition-colors ${
                          outOfStock
                            ? "opacity-40 cursor-not-allowed"
                            : "hover:border-primary hover:bg-primary/5 active:scale-95"
                        }`}
                      >
                        <span>{size}</span>
                        {sStock !== null && (
                          <span className={`text-[10px] mt-0.5 ${sStock <= 3 ? "text-red-500" : "text-muted-foreground"}`}>
                            {sStock} left
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    className="h-8 text-sm flex-1"
                    placeholder="Other size (e.g. XXL)"
                    value={sizePickerOther}
                    onChange={(e) => setSizePickerOther(e.target.value)}
                  />
                  <Button
                    size="sm"
                    disabled={!sizePickerOther.trim()}
                    onClick={() => confirmSizePicker("OTHER")}
                  >Add</Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── PER-ITEM SPECIAL PRICE DIALOG ────────────────────────────── */}
      <Dialog open={!!itemSpecialPriceOpen} onOpenChange={(o) => { if (!o) { setItemSpecialPriceOpen(null); setItemSpecialInput(""); setItemSpecialReasons([]); setItemSpecialOther(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Special Price — {cart.find(c => `${c.item.id}-${c.selectedSize ?? ""}` === itemSpecialPriceOpen)?.item.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {(() => {
              const cartItem = cart.find(c => `${c.item.id}-${c.selectedSize ?? ""}` === itemSpecialPriceOpen);
              const originalPrice = cartItem?.item.sellingPrice ?? 0;
              const newPrice = Number(itemSpecialInput);
              return (
                <>
                  <p className="text-sm text-muted-foreground">Original price: {formatCurrency(originalPrice)}</p>
                  <div className="space-y-1">
                    <Label>New Price per unit (₱)</Label>
                    <Input type="number" min="0" step="0.01" value={itemSpecialInput}
                      onChange={(e) => setItemSpecialInput(e.target.value)} placeholder="0.00" />
                    {originalPrice > 0 && newPrice >= 0 && newPrice < originalPrice && (
                      <p className="text-xs text-muted-foreground">
                        {Math.round((originalPrice - newPrice) / originalPrice * 100)}% off — saving ₱{(originalPrice - newPrice).toFixed(2)} per unit
                      </p>
                    )}
                  </div>
                </>
              );
            })()}
            <div className="space-y-2">
              <Label>Reason (select all that apply)</Label>
              {SPECIAL_PRICE_REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={itemSpecialReasons.includes(r)}
                    onChange={(e) => setItemSpecialReasons(prev => e.target.checked ? [...prev, r] : prev.filter(x => x !== r))} />
                  {r}
                </label>
              ))}
              <Input value={itemSpecialOther} onChange={(e) => setItemSpecialOther(e.target.value)} placeholder="Other reason..." className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            {cart.find(c => `${c.item.id}-${c.selectedSize ?? ""}` === itemSpecialPriceOpen)?.specialPrice !== undefined && (
              <Button variant="ghost" className="mr-auto text-destructive" onClick={() => {
                clearItemSpecialPrice(itemSpecialPriceOpen!);
                setItemSpecialPriceOpen(null);
                setItemSpecialInput(""); setItemSpecialReasons([]); setItemSpecialOther("");
              }}>Remove Override</Button>
            )}
            <Button variant="outline" onClick={() => setItemSpecialPriceOpen(null)}>Cancel</Button>
            <Button
              disabled={!itemSpecialInput || Number(itemSpecialInput) < 0 || (itemSpecialReasons.length === 0 && !itemSpecialOther.trim())}
              onClick={() => {
                const note = [...itemSpecialReasons, ...(itemSpecialOther.trim() ? [itemSpecialOther.trim()] : [])].join("; ");
                applyItemSpecialPrice(itemSpecialPriceOpen!, parseFloat(itemSpecialInput), note);
                setItemSpecialPriceOpen(null);
                setItemSpecialInput(""); setItemSpecialReasons([]); setItemSpecialOther("");
              }}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ADD / EDIT ITEM DIALOG ─────────────────────────────────────── */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingItem ? "Edit Item" : "Add Item"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={itemForm.name} onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Gatorade Blue" />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={itemForm.category} onValueChange={(v) => setItemForm((f) => ({ ...f, category: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRINKS">Drinks</SelectItem>
                  <SelectItem value="MERCHANDISE">Merchandise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Selling Price (₱)</Label>
              <Input type="number" step="0.01" min="0" value={itemForm.sellingPrice} onChange={(e) => setItemForm((f) => ({ ...f, sellingPrice: e.target.value }))} placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <Label>Photo</Label>
              {itemPhotoPreview ? (
                <div className="relative rounded-lg overflow-hidden border w-24 h-24">
                  <img src={itemPhotoPreview} className="w-full h-full object-cover" alt="item" />
                  <button className="absolute top-0.5 right-0.5 rounded-full bg-background/80 p-0.5" onClick={() => { setItemPhoto(null); setItemPhotoPreview(null); }}>
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground border rounded-md px-3 py-2 hover:border-primary w-fit">
                  <Camera className="h-4 w-4" />Upload photo
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setItemPhoto(f); setItemPhotoPreview(URL.createObjectURL(f)); }
                  }} />
                </label>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemDialog(false)}>Cancel</Button>
            <Button onClick={saveItem} disabled={savingItem || !itemForm.name || !itemForm.sellingPrice}>{savingItem ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ADD STOCK DIALOG ──────────────────────────────────────────── */}
      <Dialog open={!!restockItem} onOpenChange={(o) => { if (!o) setRestockItem(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Stock — {restockItem?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Quantity Purchased <span className="text-destructive">*</span></Label>
                <Input type="number" min="1" placeholder="e.g. 24" value={restockForm.qty} onChange={(e) => setRestockForm((f) => ({ ...f, qty: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Cost per Unit (₱)</Label>
                <Input type="number" step="0.01" placeholder="e.g. 28.00" value={restockForm.costPerUnit} onChange={(e) => setRestockForm((f) => ({ ...f, costPerUnit: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Supplier / Vendor</Label>
              <Input placeholder="e.g. SM Supermarket" value={restockForm.supplier} onChange={(e) => setRestockForm((f) => ({ ...f, supplier: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Notes / Reference</Label>
              <Input placeholder="e.g. OR #12345" value={restockForm.notes} onChange={(e) => setRestockForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            {restockItem?.category === "MERCHANDISE" && (() => {
              const customSizes: string[] = JSON.parse(restockItem.availableSizes ?? "[]");
              const knownSizes = [...DEFAULT_SIZES, ...customSizes.filter((s) => !DEFAULT_SIZES.includes(s))];
              return (
                <div className="space-y-2">
                  <Label>Size <span className="text-muted-foreground font-normal text-xs">(for this batch)</span></Label>
                  <div className="flex flex-wrap gap-2">
                    {knownSizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setRestockSize(restockSize === size ? "" : size)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                          restockSize === size
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-input hover:border-primary hover:bg-accent"
                        }`}
                      >{size}</button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setRestockSize(restockSize === "OTHER" ? "" : "OTHER")}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                        restockSize === "OTHER"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-input hover:border-primary hover:bg-accent"
                      }`}
                    >Others</button>
                  </div>
                  {restockSize === "OTHER" && (
                    <Input
                      className="h-8 text-sm"
                      placeholder="Enter size (e.g. XXL, 2XL)"
                      value={restockOtherText}
                      onChange={(e) => setRestockOtherText(e.target.value)}
                      autoFocus
                    />
                  )}
                </div>
              );
            })()}
            <div className="space-y-1">
              <Label>Purchase Date</Label>
              <Input type="date" value={restockForm.date} onChange={(e) => setRestockForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestockItem(null)}>Cancel</Button>
            <Button onClick={submitRestock} disabled={savingRestock || !restockForm.qty || parseInt(restockForm.qty) < 1}>
              {savingRestock ? "Saving..." : "Add Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── INVENTORY UPDATE DIALOG ────────────────────────────────────── */}
      <Dialog open={showInventoryDialog} onOpenChange={setShowInventoryDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Stock — {inventoryItem?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Current stock: <strong>{inventoryItem?.stock}</strong>
              {inventoryItem?.sizeStocks && inventoryItem.sizeStocks.length > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({inventoryItem.sizeStocks.filter((s) => s.stock > 0).map((s) => `${s.size}:${s.stock}`).join(" · ")})
                </span>
              )}
            </p>
            {inventoryItem?.category === "MERCHANDISE" && (() => {
              const customSizes: string[] = JSON.parse(inventoryItem.availableSizes ?? "[]");
              const knownSizes = [...DEFAULT_SIZES, ...customSizes.filter((s) => !DEFAULT_SIZES.includes(s))];
              // Also show sizes that already have stock
              const stockedSizes = (inventoryItem.sizeStocks ?? []).map((s) => s.size).filter((s) => !knownSizes.includes(s));
              const allOptions = [...knownSizes, ...stockedSizes];
              return (
                <div className="space-y-2">
                  <Label>Size <span className="text-muted-foreground font-normal text-xs">(optional — leave blank to adjust total without size)</span></Label>
                  <div className="flex flex-wrap gap-2">
                    {allOptions.map((size) => {
                      const sStock = (inventoryItem.sizeStocks ?? []).find((s) => s.size === size)?.stock ?? 0;
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setInvSize(invSize === size ? "" : size)}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                            invSize === size
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-input hover:border-primary hover:bg-accent"
                          }`}
                        >{size}{sStock > 0 && <span className="ml-1 opacity-60 text-xs">({sStock})</span>}</button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setInvSize(invSize === "OTHER" ? "" : "OTHER")}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                        invSize === "OTHER"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-input hover:border-primary hover:bg-accent"
                      }`}
                    >Others</button>
                  </div>
                  {invSize === "OTHER" && (
                    <Input
                      className="h-8 text-sm"
                      placeholder="Enter size (e.g. XXL, 2XL)"
                      value={invOtherText}
                      onChange={(e) => setInvOtherText(e.target.value)}
                      autoFocus
                    />
                  )}
                </div>
              );
            })()}
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={invType} onValueChange={(v) => setInvType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="COUNT">Stock Count (set exact number)</SelectItem>
                  <SelectItem value="ADJUSTMENT">Manual Adjustment (+/-)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{invType === "COUNT" ? "Counted Quantity" : "Adjustment (+/-)"}</Label>
              <Input type="number" value={invQty} onChange={(e) => setInvQty(e.target.value)} placeholder={invType === "COUNT" ? "e.g. 24" : "e.g. +10 or -3"} />
            </div>
            <div className="space-y-1">
              <Label>Reason (optional)</Label>
              <Input value={invReason} onChange={(e) => setInvReason(e.target.value)} placeholder="e.g. Weekly count, Received delivery, Damaged" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInventoryDialog(false)}>Cancel</Button>
            <Button onClick={saveInventory} disabled={savingInv || !invQty}>{savingInv ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── INVENTORY LOGS DIALOG ─────────────────────────────────────── */}
      <Dialog open={showLogsDialog} onOpenChange={setShowLogsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Inventory Logs</DialogTitle></DialogHeader>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No inventory logs yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2">
                    <SortableHeader label="Date" direction={invLogsSortDir} onClick={() => setInvLogsSortDir((d) => (d === "asc" ? "desc" : "asc"))} />
                  </th>
                  <th className="text-left px-3 py-2">Item</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-right px-3 py-2">Qty</th>
                  <th className="text-left px-3 py-2">Reason</th>
                  <th className="text-left px-3 py-2">By</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...logs].sort((a, b) => {
                  const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                  return invLogsSortDir === "asc" ? diff : -diff;
                }).map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{new Date(log.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}</td>
                    <td className="px-3 py-2 font-medium">{log.shopItem.name}</td>
                    <td className="px-3 py-2"><Badge variant={log.type === "COUNT" ? "secondary" : "outline"}>{log.type}</Badge></td>
                    <td className={`px-3 py-2 text-right font-mono font-semibold ${log.quantity < 0 ? "text-red-600" : "text-green-700"}`}>
                      {log.quantity > 0 && log.type !== "COUNT" ? "+" : ""}{log.quantity}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{log.reason ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{log.staffName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DialogContent>
      </Dialog>

      {/* ── EDIT SALE DIALOG ──────────────────────────────────────────── */}
      <Dialog open={!!editingSale} onOpenChange={(open) => { if (!open) setEditingSale(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Sale</DialogTitle></DialogHeader>
          {editingSale && (
            <div className="space-y-4 py-2">
              {/* Items — read-only summary */}
              <div className="rounded-md bg-muted/40 px-3 py-2 text-sm space-y-1">
                <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1">Items (read-only)</p>
                {editingSale.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{i.shopItem.name} ×{i.quantity}</span>
                    <span className="font-medium">{formatCurrency(i.priceAtSale * i.quantity)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t pt-1 mt-1 font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(editingSale.total)}</span>
                </div>
              </div>

              {/* Buyer */}
              <div className="space-y-2">
                <Label>Buyer</Label>
                {editSelectedBuyer ? (
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{editSelectedBuyer.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{editSelectedBuyer.type} · {editSelectedBuyer.sub}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => { setEditSelectedBuyer(null); setEditBuyerSearch(""); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-9" placeholder="Search member or employee..." value={editBuyerSearch} onChange={(e) => setEditBuyerSearch(e.target.value)} />
                    </div>
                    {editBuyerResults.length > 0 && (
                      <div className="rounded-md border divide-y max-h-36 overflow-y-auto">
                        {editBuyerResults.map((r) => (
                          <button key={r.id} className="w-full text-left px-3 py-2 hover:bg-muted text-sm" onClick={() => { setEditSelectedBuyer(r); setEditBuyerSearch(""); setEditBuyerResults([]); setEditWalkInName(""); }}>
                            <p className="font-medium">{r.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{r.type} · {r.sub}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs text-muted-foreground">or walk-in</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <Input placeholder="Walk-in name" value={editWalkInName} onChange={(e) => setEditWalkInName(e.target.value)} />
                  </div>
                )}
              </div>

              {/* Payment */}
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <Select value={editPaymentMode} onValueChange={(v) => { setEditPaymentMode(v); setEditPaymentSub(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select payment mode..." /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                {PAYMENT_SUB[editPaymentMode] && (
                  <Select value={editPaymentSub} onValueChange={setEditPaymentSub}>
                    <SelectTrigger><SelectValue placeholder={`Select ${editPaymentMode} method...`} /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_SUB[editPaymentMode].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Optional notes..." />
              </div>

              {/* Receipt */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editNeedsReceiptCheck"
                    checked={editNeedsReceipt}
                    onChange={(e) => setEditNeedsReceipt(e.target.checked)}
                    className="h-4 w-4 accent-primary cursor-pointer"
                  />
                  <label htmlFor="editNeedsReceiptCheck" className="text-sm font-medium cursor-pointer select-none">Needs Receipt</label>
                </div>
                <Label>Receipt / Proof of Payment</Label>
                {editReceiptPreview ? (
                  <div className="relative rounded-lg overflow-hidden border">
                    <img src={editReceiptPreview} className="w-full max-h-48 object-contain bg-muted" alt="receipt" />
                    <div className="absolute top-1 right-1 flex gap-1">
                      {editingSale.receiptUrl && editReceiptPreview === editingSale.receiptUrl && (
                        <a href={editReceiptPreview} target="_blank" rel="noopener noreferrer" className="rounded bg-background/80 px-2 py-0.5 text-xs hover:bg-background">
                          Open
                        </a>
                      )}
                      <button className="rounded-full bg-background/80 p-1 hover:bg-background" onClick={() => { setEditReceiptFile(null); setEditReceiptPreview(null); if (editReceiptRef.current) editReceiptRef.current.value = ""; }}>
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    {editReceiptFile && <div className="absolute bottom-1 left-1 bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded">Pending upload</div>}
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-4 cursor-pointer hover:border-primary transition-colors">
                    <Camera className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Upload receipt photo</span>
                    <input type="file" accept="image/*" capture="environment" className="hidden" ref={editReceiptRef} onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) { setEditReceiptFile(f); setEditReceiptPreview(URL.createObjectURL(f)); }
                    }} />
                  </label>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSale(null)}>Cancel</Button>
            <Button onClick={saveSaleEdit} disabled={savingSale || !editPaymentMode || (!!PAYMENT_SUB[editPaymentMode] && !editPaymentSub)}>
              {savingSale ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
