"use client";

import { useState } from "react";
import Link from "next/link";
import { PortalShell } from "@/components/portal/PortalShell";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Can } from "@/components/auth/Can";

export default function ComptageLiturgiquePage() {
  const { alert, confirm } = useConfirm();
  const [counter1, setCounter1] = useState("mba");
  const [counter2, setCounter2] = useState("ebogo");
  const [cultType, setCultType] = useState("1er Culte d'Adoration & Sainte-Cène");

  // Cash denomination counts
  const [cashCounts, setCashCounts] = useState<{ [key: string]: number }>({
    b10000: 84, // 840,000 F
    b5000: 92,  // 460,000 F
    b2000: 115, // 230,000 F
    b1000: 160, // 160,000 F
    b500: 75,   // 37,500 F
    p500: 42,   // 21,000 F
    p100: 340,  // 34,000 F
    p50: 180,   // 9,000 F
    p25: 120,   // 3,000 F
  });

  const denominations: { [key: string]: number } = {
    b10000: 10000,
    b5000: 5000,
    b2000: 2000,
    b1000: 1000,
    b500: 500,
    p500: 500,
    p100: 100,
    p50: 50,
    p25: 25,
  };

  const calculateTotalCash = (): number => {
    return Object.keys(cashCounts).reduce(
      (sum: number, key: string) => sum + ((cashCounts[key] || 0) * (denominations[key] || 0)),
      0
    );
  };

  const [mobileTotal, setMobileTotal] = useState<number>(0);
  const grandTotal = calculateTotalCash() + mobileTotal;

  const [isSealed, setIsSealed] = useState(false);

  const handleSeal = async () => {
    if (counter1 === counter2) {
      await alert({
        title: "Erreur Canonique",
        message: "Les deux signataires du procès-verbal de comptage doivent être deux diacres distincts !",
        variant: "danger",
      });
      return;
    }

    const ok = await confirm({
      title: "Sceller le Procès-Verbal de Comptage",
      message: `Confirmez-vous le scellement définitif du comptage en binôme pour un montant total de ${grandTotal.toLocaleString()} FCFA (${calculateTotalCash().toLocaleString()} FCFA espèces + ${mobileTotal.toLocaleString()} FCFA Mobile Money) pour le « ${cultType} » ? Ce procès-verbal sera verrouillé et transmis à la trésorerie.`,
      confirmText: "Sceller & Valider le Culte",
      variant: "primary",
    });

    if (!ok) return;

    setIsSealed(true);

    await alert({
      title: "Comptage Scellé & Enregistré",
      message: `Le procès-verbal de comptage a été scellé par les deux diacres et crédité au grand livre de caisse.`,
      variant: "primary",
    });
  };

  return (
    <PortalShell>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <nav className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
            <Link href="/dashboard" className="hover:text-primary flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">home</span>
              <span>Accueil</span>
            </Link>
            <span>/</span>
            <Link href="/finance" className="hover:text-primary">
              Finance
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Séances de Comptage</span>
          </nav>

          <span className="text-xs text-on-surface-variant font-mono bg-surface-container px-3 py-1 rounded-full">
            Réf. PV : #PV-TSG-2025-0330-01
          </span>
        </div>

        {/* Header */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-surface-container-high/60 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  {isSealed ? "Scellé & Clôturé au Grand Livre" : "Séance Ouverte • Dépouillement Contradictoire"}
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-on-surface tracking-tight font-headline-lg mt-1">
                Séance de Comptage &amp; Procès-Verbal Liturgique
              </h1>
              <p className="text-xs text-on-surface-variant mt-1">
                Dépouillement contradictoire des troncs et corbeilles d'offrandes. Double signature canonique obligatoire.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => window.print()}
                className="h-10 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                <span>Imprimer PV Scellé</span>
              </button>
              {!isSealed && (
                <Can permission="can:seal_count_pv" minRole={2}>
                  <button
                    type="button"
                    onClick={handleSeal}
                    className="h-10 px-5 rounded-xl bg-primary-container hover:bg-primary text-on-primary flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <span>Sceller &amp; Valider le Culte</span>
                  </button>
                </Can>
              )}
            </div>
          </div>
        </div>

        {/* Liturgical Context & Two-Man Counting Rule */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 4 Cols: Service Context */}
          <div className="lg:col-span-4 bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-surface-container-high/60 space-y-4">
            <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">church</span>
              <span>Contexte de l'Office</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-surface-container-low">
                <span className="text-on-surface-variant block">Date et Culte :</span>
                <span className="font-bold text-on-surface mt-0.5 block capitalize">
                  {new Date().toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} • Office en direct
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low">
                <span className="text-on-surface-variant block mb-1">Type d'Office Liturgique :</span>
                <select
                  value={cultType}
                  onChange={(e) => setCultType(e.target.value)}
                  className="w-full p-2 bg-surface-container-lowest rounded-lg font-semibold border border-surface-container-high focus:outline-none"
                >
                  <option>1er Culte d'Adoration &amp; Sainte-Cène (Tsinga)</option>
                  <option>2nd Culte Évangélique &amp; Bénédictions</option>
                  <option>Culte de Jeunesse (Youth Flame)</option>
                  <option>Veillée Territoriale d'Intercession</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low">
                <span className="text-on-surface-variant block">Lieu de Dépouillement :</span>
                <span className="font-bold text-on-surface mt-0.5 block">
                  Salle du Trésor Diaconal • Temple Central Tsinga
                </span>
              </div>
            </div>
          </div>

          {/* Right 8 Cols: Dual Counters Verification */}
          <div className="lg:col-span-8 bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-surface-container-high/60 space-y-4">
            <div className="p-3 rounded-xl bg-surface-container-low flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-[24px]">verified_user</span>
              <div className="text-xs">
                <span className="font-bold text-on-surface block">
                  Règle Canonique du Contrôle Contradictoire (Const. Art. 48)
                </span>
                <p className="text-on-surface-variant mt-0.5">
                  Deux compteurs assermentés distincts doivent valider et signer conjointement la séance.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Counter 1 */}
              <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high space-y-2">
                <span className="font-bold text-primary block">Compteur 1 (Trésorier Titulaire)</span>
                <select
                  value={counter1}
                  onChange={(e) => setCounter1(e.target.value)}
                  className="w-full p-2 bg-surface-container-lowest rounded-lg font-bold border border-surface-container-high"
                >
                  <option value="mba">Diacre Pierre Mba (Collège des Diacres)</option>
                  <option value="ndongo">Diacre Thomas Ndongo (Trésorier)</option>
                </select>
                <div className="flex items-center gap-2 pt-1 text-[11px] text-tertiary font-bold">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>Signature Diaconale Confirmée</span>
                </div>
              </div>

              {/* Counter 2 */}
              <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high space-y-2">
                <span className="font-bold text-secondary block">Compteur 2 (Ancien / Auditeur)</span>
                <select
                  value={counter2}
                  onChange={(e) => setCounter2(e.target.value)}
                  className="w-full p-2 bg-surface-container-lowest rounded-lg font-bold border border-surface-container-high"
                >
                  <option value="ebogo">Ancien Victor Ebogo (Conseil Pastoral)</option>
                  <option value="fotso">Diaconesse Marthe Fotso (Auditrice)</option>
                </select>
                <div className="flex items-center gap-2 pt-1 text-[11px] text-tertiary font-bold">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>Signature Diaconale Confirmée</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Physical Cash Counting Matrix (BEAC Banknotes & Coins) */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-surface-container-high/60 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
            <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">payments</span>
              <span>Matrice de Dépouillement des Espèces (BEAC / CEMAC)</span>
            </h3>
            <span className="text-xs font-bold text-on-surface-variant">
              Sous-total Espèces :{" "}
              <strong className="text-primary text-sm">{calculateTotalCash().toLocaleString()} FCFA</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {Object.keys(denominations).map((key) => {
              const denom = denominations[key] || 0;
              const count = cashCounts[key] || 0;
              const subtotal = count * denom;
              const isNote = String(key).startsWith("b");

              return (
                <div
                  key={key}
                  className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="font-bold text-on-surface block">
                      {denom.toLocaleString()} FCFA {isNote ? "(Billet)" : "(Pièce)"}
                    </span>
                    <span className="text-[11px] text-on-surface-variant font-mono">
                      = {subtotal.toLocaleString()} FCFA
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-on-surface-variant font-medium">Qté :</span>
                    <input
                      type="number"
                      value={count}
                      disabled={isSealed}
                      onChange={(e) =>
                        setCashCounts({
                          ...cashCounts,
                          [key]: Math.max(0, parseInt(e.target.value) || 0),
                        })
                      }
                      className="w-16 h-8 text-center bg-surface-container-lowest rounded-lg font-bold border border-surface-container-high"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Saisie de la collecte Mobile Money reçue durant le culte */}
          <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="font-bold text-xs text-on-surface block">Collecte Électronique (SasPay Mobile Money / Orange Money)</span>
              <span className="text-[11px] text-on-surface-variant">Dîmes et offrandes enregistrées en ligne durant l'office</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                disabled={isSealed}
                value={mobileTotal}
                onChange={(e) => setMobileTotal(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-36 h-9 px-3 text-right bg-surface-container-lowest rounded-lg font-bold border border-surface-container-high text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-xs font-bold text-on-surface-variant">FCFA</span>
            </div>
          </div>

          {/* Grand Total Summary Box */}
          <div className="p-6 rounded-2xl bg-surface-container-low border border-surface-container-high mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs font-bold uppercase text-on-surface-variant tracking-wider">
                Recette Totale du Culte (Espèces + Mobile Money)
              </span>
              <p className="text-xs text-on-surface-variant">
                Espèces : {calculateTotalCash().toLocaleString()} FCFA • Mobile Money : {mobileTotal.toLocaleString()} FCFA
              </p>
            </div>
            <div className="text-center sm:text-right">
              <span className="text-2xl sm:text-3xl font-black text-primary">
                {grandTotal.toLocaleString()} FCFA
              </span>
              <span className="text-xs text-tertiary font-bold block">
                ● Concordance comptable vérifiée
              </span>
            </div>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
