import { useMemo, useState } from "react";
import { Building2, ShieldCheck } from "lucide-react";
import { PublicSiteFooter } from "@/components/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/PublicSiteHeader";

export default function PublicOutcomesPage() {
  return <main className="service-shell"><PublicSiteHeader section="公開專案成果" /><section className="service-hero"><p className="club-section-number">PUBLIC PARTNERS</p><h1>公開專案成果</h1><p>為保障專案成員、合作單位與內部交付資料，訪客僅可瀏覽已取得公開同意的合作企業資訊。專案卡片、流程、文件與職涯地圖均須登入並通過授權檢核。</p></section><section className="service-content"><div className="service-ledger"><ShieldCheck /><div><strong>公開範圍與隱私</strong><span>合作企業名稱、識別資料或成果摘要都必須先取得真實且明確的公開授權，系統不會以示範資料補足。</span></div></div><section className="service-empty" aria-labelledby="public-partner-heading"><Building2 size={28} /><h2 id="public-partner-heading">合作過的企業</h2><p>目前尚未提供可公開刊登的合作企業資料。因此此區塊維持空白，不顯示推測的企業名稱、專案內容、照片或成果。</p></section></section><PublicSiteFooter /></main>;
}
