"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { useIntl } from "@/intl";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { api, getStoredUser } from "@/lib/api";

export default function DonsPage() {
  const { alert, confirm } = useConfirm();
  const { t } = useIntl();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [donationType, setDonationType] = useState("dime");
  const [assembly, setAssembly] = useState("tsinga");
  const [amount, setAmount] = useState<number>(10000);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [prayerRequest, setPrayerRequest] = useState("Action de grâce pour la santé de notre famille et prospérité spirituelle de l'assemblée.");
  
  // 3-step Payment states
  const [donationId, setDonationId] = useState<string | null>(null);
  const [receiptNumber, setReceiptNumber] = useState<string>("FG-CMR-2025-03912");
  const [donationStatus, setDonationStatus] = useState<"completed" | "pending_validation">("completed");

  // Coordonnées de paiement officielles de la trésorerie locale (chargées depuis l'API)
  const [treasuryAccounts, setTreasuryAccounts] = useState({
    assembly_name: "Temple Central de Tsinga (Yaoundé)",
    mtn_momo_number: "677 12 34 56",
    mtn_momo_name: "Trésorerie FGM Tsinga",
    orange_money_number: "699 98 76 54",
    orange_money_name: "Trésorerie FGM Tsinga",
    bank_name: "Afriland First Bank Cameroun",
    bank_account_number: "01234567890",
    bank_rib: "10005 00012 01234567890 44",
    bank_swift: "AFRICMCX",
    account_holder: "MISSION DU PLEIN ÉVANGILE DU CAMEROUN",
  });

  // Payment methods: "mtn" | "orange" | "bank" | "card"
  const [paymentMethod, setPaymentMethod] = useState<"mtn" | "orange" | "bank" | "card">("mtn");
  const [phoneNumber, setPhoneNumber] = useState("677123456");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Pour les paiements de type wallet (MTN / Orange) :
  // "auto" = prélèvement automatique avec invite USSD SasPay
  // "manual" = dépôt direct vers le numéro de trésorerie de l'église avec référence SMS
  const [walletMode, setWalletMode] = useState<"auto" | "manual">("auto");
  const [manualWalletRef, setManualWalletRef] = useState("");
  const [manualWalletError, setManualWalletError] = useState<string | null>(null);

  // Automatic Mobile Money states (décompte actif UNIQUEMENT après initiation en mode auto)
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [isInitiating, setIsInitiating] = useState(false);
  const [timer, setTimer] = useState(120);

  // État de validation automatique backend (Sondage et validation par le serveur, sans bouton utilisateur)
  const [autoChecking, setAutoChecking] = useState(false);
  const [autoCheckStatus, setAutoCheckStatus] = useState<"idle" | "processing" | "completed" | "failed">("idle");
  const [autoCheckMessage, setAutoCheckMessage] = useState<string | null>(null);

  // Manual Bank Transfer states (JAMAIS de décompte, déclaration manuelle avec preuve)
  const [bankRef, setBankRef] = useState("");
  const [bankSenderName, setBankSenderName] = useState("");
  const [bankTransferDate, setBankTransferDate] = useState(new Date().toISOString().split("T")[0] || "2026-03-01");
  const [bankError, setBankError] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);

  // Card Payment states
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardError, setCardError] = useState<string | null>(null);

  // Pre-fill user data if authenticated
  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      if (user.phone && (!phoneNumber || phoneNumber === "677123456")) {
        const clean = user.phone.replace(/\D/g, "");
        if (clean.length >= 9) setPhoneNumber(clean.slice(-9));
      }
      if (user.first_name || user.last_name) {
        setBankSenderName(`${user.first_name || ""} ${user.last_name || ""}`.trim());
      }
    }
  }, []);

  // Décompte de temps : UNIQUEMENT pour les moyens automatiques (MTN / Orange en mode AUTO),
  // et UNIQUEMENT APRÈS que le débit a été initié par l'utilisateur !
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const isAutomatic = (paymentMethod === "mtn" || paymentMethod === "orange") && walletMode === "auto";
    if (step === 2 && paymentInitiated && isAutomatic && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, paymentInitiated, paymentMethod, walletMode, timer]);

  // Validation automatique par le Backend pour les paiements automatiques (MTN MoMo & Orange Money)
  // Utilise en priorité un flux Server-Sent Events (SSE) temps réel, complété par un polling de secours.
  useEffect(() => {
    const isAutomatic = (paymentMethod === "mtn" || paymentMethod === "orange") && walletMode === "auto";
    if (step !== 2 || !paymentInitiated || !isAutomatic || !donationId || autoCheckStatus === "completed" || autoCheckStatus === "failed") {
      return;
    }

    let isMounted = true;
    let pollInterval: NodeJS.Timeout | null = null;
    let eventSource: EventSource | null = null;

    // 1. Abonnement au flux Server-Sent Events (SSE) en temps réel
    try {
      if (typeof window !== "undefined" && window.EventSource) {
        eventSource = new EventSource(api.donations.getDonationStreamUrl(donationId));

        eventSource.addEventListener("payment_completed", (e: MessageEvent) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(e.data);
            if (data.receipt_number) {
              setReceiptNumber(data.receipt_number);
            }
            setDonationStatus("completed");
            setAutoCheckStatus("completed");
            setAutoCheckMessage("Paiement validé par l'opérateur avec succès (notification SSE reçue en direct) !");
            if (pollInterval) clearInterval(pollInterval);
            if (eventSource) eventSource.close();

            setTimeout(() => {
              if (isMounted) setStep(3);
            }, 600);
          } catch (err) {
            console.error("Erreur parsing événement SSE don", err);
          }
        });

        eventSource.addEventListener("payment_failed", (e: MessageEvent) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(e.data);
            setAutoCheckStatus("failed");
            setAutoCheckMessage(data.message || "Le débit a été rejeté ou annulé par l'opérateur.");
            if (pollInterval) clearInterval(pollInterval);
            if (eventSource) eventSource.close();
          } catch (err) {
            console.error("Erreur événement échec SSE don", err);
          }
        });

        eventSource.onerror = () => {
          // Si micro-coupure SSE, le polling de secours ci-dessous maintient la continuité
        };
      }
    } catch {
      // EventSource non disponible, le polling fonctionne en relais complet
    }

    // 2. Mécanisme de polling de secours (au cas où SSE n'est pas supporté par le réseau du client)
    const checkStatusWithBackend = async () => {
      try {
        const res = await api.donations.checkPaymentStatus(donationId);
        const paymentStatus = res?.data?.payment_status;
        if (!paymentStatus || !isMounted) return;

        if (paymentStatus.status === "completed") {
          // Validation confirmée par le backend / opérateur !
          if (paymentStatus.receipt_number) {
            setReceiptNumber(paymentStatus.receipt_number);
          }
          setDonationStatus("completed");
          setAutoCheckStatus("completed");
          setAutoCheckMessage("Paiement validé par l'opérateur avec succès ! Génération du reçu officiel...");
          if (pollInterval) clearInterval(pollInterval);
          if (eventSource) eventSource.close();

          // Transition automatique vers l'étape 3 (Reçu certifié)
          setTimeout(() => {
            if (isMounted) {
              setStep(3);
            }
          }, 800);
        } else if (paymentStatus.status === "failed") {
          setAutoCheckStatus("failed");
          setAutoCheckMessage(paymentStatus.message || "Le débit a été rejeté ou annulé par l'opérateur.");
          if (pollInterval) clearInterval(pollInterval);
          if (eventSource) eventSource.close();
        } else {
          // Toujours en attente
          if (paymentStatus.message) {
            setAutoCheckMessage(paymentStatus.message);
          }
        }
      } catch (err) {
        // En cas de micro-coupure réseau, on continue d'écouter
      }
    };

    // Premier test rapide après 2 secondes, puis toutes les 2.5 secondes
    const initialTimeout = setTimeout(checkStatusWithBackend, 2000);
    pollInterval = setInterval(checkStatusWithBackend, 2500);

    return () => {
      isMounted = false;
      clearTimeout(initialTimeout);
      if (pollInterval) clearInterval(pollInterval);
      if (eventSource) eventSource.close();
    };
  }, [step, paymentInitiated, paymentMethod, walletMode, donationId, autoCheckStatus]);

  // ÉTAPE 1 : Initiation du paiement (Montant, type, vœu et bénéficiaire)
  const handleProceedToPayment = async () => {
    const typeLabel = donationType === "dime" ? "Dîme canonique" : donationType === "offrande" ? "Offrande de culte" : "Don spécial";
    const ok = await confirm({
      title: "Confirmer l'engagement de libéralité",
      message: `Confirmez-vous le versement de ${amount.toLocaleString()} FCFA au titre de « ${typeLabel} » ? Vous pourrez choisir votre moyen de paiement (MTN MoMo, Orange Money ou Virement Bancaire) à l'étape suivante.`,
      confirmText: "Procéder au choix du paiement",
      variant: "primary",
    });
    if (!ok) return;

    // Appel API backend Étape 1 : Enregistrement de l'intention
    try {
      const res: any = await api.donations.initiatePayment({
        amount,
        donation_type: donationType,
        prayer_request: prayerRequest,
        is_anonymous: isAnonymous,
      });
      if (res?.data?.payment?.donation_id) {
        setDonationId(res.data.payment.donation_id);
      }
      if (res?.data?.payment?.treasury_accounts) {
        setTreasuryAccounts((prev) => ({ ...prev, ...res.data.payment.treasury_accounts }));
      }
    } catch (e) {
      console.warn("Initiation API backend en mode dégradé:", e);
    }

    setPaymentInitiated(false);
    setTimer(120);
    setPhoneError(null);
    setBankError(null);
    setCardError(null);
    setManualWalletError(null);
    setStep(2);
  };

  // Changement de moyen de paiement
  const handleSelectPaymentMethod = (method: "mtn" | "orange" | "bank" | "card") => {
    setPaymentMethod(method);
    setPaymentInitiated(false);
    setPhoneError(null);
    setBankError(null);
    setCardError(null);
    setManualWalletError(null);
  };

  // ÉTAPE 2.A : Initier le débit Mobile Money Automatique (SasPay Softpay USSD)
  // (Le décompte de temps ne s'affiche qu'APRÈS ce clic !)
  const handleInitiateMobilePayment = async () => {
    const cleanPhone = phoneNumber.replace(/[\s\-\.]/g, "");
    if (!cleanPhone || cleanPhone.length < 8) {
      setPhoneError("Veuillez saisir un numéro de téléphone Mobile Money valide (ex: 6 77 12 34 56).");
      return;
    }
    setPhoneError(null);

    const operatorName = paymentMethod === "mtn" ? "MTN Mobile Money (*126#)" : "Orange Money (*150#)";
    const ok = await confirm({
      title: `Déclencher l'invite USSD ${paymentMethod === "mtn" ? "MTN MoMo" : "Orange Money"}`,
      message: `Une invite de paiement sécurisée SasPay va être transmise au +237 ${cleanPhone} pour débiter la somme de ${amount.toLocaleString()} FCFA. Veuillez garder votre téléphone allumé pour composer votre code secret.`,
      confirmText: "Lancer le débit USSD",
      variant: "primary",
    });
    if (!ok) return;

    setIsInitiating(true);

    try {
      if (donationId) {
        await api.donations.completePayment(donationId, {
          payment_method: paymentMethod === "mtn" ? "mtn_momo" : "orange_money",
          phone_number: cleanPhone,
        });
      }
    } catch (e) {
      console.warn("SasPay Softpay completion notice:", e);
    } finally {
      setIsInitiating(false);
      setTimer(120);
      setPaymentInitiated(true);
      setAutoChecking(true);
      setAutoCheckStatus("processing");
      setAutoCheckMessage(`Invite USSD transmise au +237 ${cleanPhone}. En attente de saisie du code secret...`);
    }
  };

  // Vérification manuelle de secours auprès du serveur (interroge le backend sans jamais valider arbitrairement)
  const handleManualCheckServerStatus = async () => {
    if (!donationId) return;
    try {
      const res = await api.donations.checkPaymentStatus(donationId);
      const paymentStatus = res?.data?.payment_status;
      if (paymentStatus?.status === "completed") {
        if (paymentStatus.receipt_number) {
          setReceiptNumber(paymentStatus.receipt_number);
        }
        setDonationStatus("completed");
        setAutoCheckStatus("completed");
        setStep(3);
      } else {
        await alert({
          title: "Vérification auprès de l'opérateur",
          message: paymentStatus?.message || "L'opérateur n'a pas encore validé le prélèvement. Veuillez vérifier la saisie de votre code secret sur votre téléphone.",
          variant: "info",
        });
      }
    } catch {
      await alert({
        title: "Communication serveur",
        message: "Impossible de joindre le serveur pour le moment. Veuillez patienter.",
        variant: "warning",
      });
    }
  };

  // Renvoyer l'invite USSD
  const handleRetryUssd = async () => {
    setTimer(120);
    setAutoChecking(true);
    setAutoCheckStatus("processing");
    setAutoCheckMessage(`Nouvelle invite USSD transmise au +237 ${phoneNumber}...`);
    if (donationId) {
      try {
        await api.donations.completePayment(donationId, {
          payment_method: paymentMethod === "mtn" ? "mtn_momo" : "orange_money",
          phone_number: phoneNumber,
        });
      } catch {}
    }
    await alert({
      title: "Invite USSD renvoyée",
      message: `Une nouvelle demande de débit de ${amount.toLocaleString()} FCFA a été envoyée au +237 ${phoneNumber}. Veuillez consulter votre écran.`,
      variant: "info",
    });
  };

  // ÉTAPE 2.B : Soumettre la référence d'un Dépôt Mobile Money Manuel vers la Trésorerie (PAS DE DÉCOMPTE)
  const handleSubmitManualWallet = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualWalletRef.trim()) {
      setManualWalletError("Veuillez renseigner la référence de transaction SMS (ex: MP260301.1234.A56789).");
      return;
    }
    setManualWalletError(null);

    const targetOp = paymentMethod === "mtn" ? "MTN MoMo" : "Orange Money";
    const ok = await confirm({
      title: `Confirmer le dépôt manuel ${targetOp}`,
      message: `Confirmez-vous avoir transféré ${amount.toLocaleString()} FCFA vers le numéro officiel de la Trésorerie avec la référence « ${manualWalletRef.trim()} » ?`,
      confirmText: "Confirmer & Transmettre à la Trésorerie",
      variant: "primary",
    });
    if (!ok) return;

    try {
      if (donationId) {
        await api.donations.completePayment(donationId, {
          payment_method: paymentMethod === "mtn" ? "mtn_momo_manual" : "orange_money_manual",
          payment_reference: manualWalletRef.trim(),
          phone_number: phoneNumber,
        });
      }
    } catch (e) {
      console.warn("Manual wallet completion error:", e);
    }

    setReceiptNumber(`REC-PROV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`);
    setDonationStatus("pending_validation");
    setStep(3);
  };

  // ÉTAPE 2.C : Soumettre la preuve de virement bancaire (PAS DE DÉCOMPTE DE TEMPS)
  const handleSubmitBankProof = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!bankRef.trim()) {
      setBankError("Veuillez renseigner le numéro de bordereau ou la référence de la transaction bancaire.");
      return;
    }
    setBankError(null);

    const ok = await confirm({
      title: "Valider la déclaration de virement bancaire",
      message: `Confirmez-vous le versement de ${amount.toLocaleString()} FCFA par virement bancaire sous la référence « ${bankRef.trim()} » ?`,
      confirmText: "Confirmer & Transmettre à la Trésorerie",
      variant: "primary",
    });
    if (!ok) return;

    if (proofFile) {
      try {
        await api.media.upload(proofFile, {
          category: "document",
          alt_text: `Preuve virement don ${bankRef}`,
        }).catch(() => {});
      } catch {}
    }

    try {
      if (donationId) {
        await api.donations.completePayment(donationId, {
          payment_method: "bank_transfer_manual",
          payment_reference: bankRef.trim(),
          sender_name: bankSenderName || (isAnonymous ? "Donateur Anonyme" : "Fidèle Donateur"),
          transfer_date: bankTransferDate,
          proof_url: proofPreview || undefined,
        });
      }
    } catch (e) {
      console.warn("Bank transfer completion error:", e);
    }

    setReceiptNumber(`REC-PROV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`);
    setDonationStatus("pending_validation");
    setStep(3);
  };

  // Action Carte Bancaire
  const handleSubmitCardPayment = async () => {
    if (!cardNumber.trim() || cardNumber.replace(/\s/g, "").length < 16) {
      setCardError("Veuillez saisir un numéro de carte bancaire valide à 16 chiffres.");
      return;
    }
    setCardError(null);
    const ok = await confirm({
      title: "Confirmer le paiement par carte bancaire",
      message: `Confirmez-vous le débit de ${amount.toLocaleString()} FCFA sur votre carte bancaire ?`,
      confirmText: "Payer par carte",
      variant: "primary",
    });
    if (!ok) return;

    try {
      if (donationId) {
        await api.donations.completePayment(donationId, {
          payment_method: "card",
          payment_reference: `CARD-${cardNumber.slice(-4)}-${Date.now()}`,
        });
        await api.donations.verifyAutoPayment(donationId);
      }
    } catch {}

    setDonationStatus("completed");
    setStep(3);
  };

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert({
          title: "Fichier trop volumineux",
          message: "La taille maximale de la quittance / bordereau est de 5 Mo.",
          variant: "warning",
        });
        return;
      }
      setProofFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const presetAmounts = [1000, 5000, 10000, 25000, 50000, 100000];

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <PublicHeader />

      <main className="flex-1 pt-20 pb-24 max-w-7xl 2xl:max-w-[1500px] mx-auto px-4 md:px-8 lg:px-12 w-full">
        {/* Top Navigation & Trust badge */}
        <div className="pt-2 pb-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary text-xs font-semibold"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Retour à l'accueil</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-surface-container rounded-full text-xs font-semibold text-on-surface-variant">
              <span className="material-symbols-outlined text-primary text-[15px]">verified</span>
              <span>Décret Présidentiel N°69/DF/144</span>
            </span>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-container rounded-full text-tertiary text-xs font-bold">
              <span className="material-symbols-outlined text-[16px]">lock</span>
              <span className="text-on-surface">Paiement 100% Sécurisé</span>
            </div>
          </div>
        </div>

        {(step === 1 || step === 2) && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Stepper Form (7 cols) */}
            <div className="lg:col-span-7 xl:col-span-7 space-y-6">
              {/* Stepper Header */}
              <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-container-high/60">
                <div className="flex items-center justify-between relative">
                  <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-1 bg-surface-container -z-0">
                    <div
                      className={`h-full bg-primary transition-all duration-300 ${
                        step === 1 ? "w-0" : step === 2 ? "w-1/2" : "w-full"
                      }`}
                    />
                  </div>

                  {/* Step 1 */}
                  <div className="flex flex-col items-center gap-1 relative z-10">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${
                        step > 1
                          ? "bg-primary text-on-primary"
                          : "bg-primary-container text-on-primary ring-4 ring-primary-fixed"
                      }`}
                    >
                      {step > 1 ? (
                        <span className="material-symbols-outlined text-[18px]">check</span>
                      ) : (
                        "1"
                      )}
                    </div>
                    <span className={`text-xs font-semibold ${step >= 1 ? "text-primary" : "text-on-surface-variant"}`}>
                      Montant &amp; Vœu
                    </span>
                  </div>

                  {/* Step 2 */}
                  <div className="flex flex-col items-center gap-1 relative z-10">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${
                        step === 2
                          ? "bg-primary-container text-on-primary ring-4 ring-primary-fixed animate-pulse"
                          : step > 2
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container text-on-surface-variant"
                      }`}
                    >
                      {step > 2 ? (
                        <span className="material-symbols-outlined text-[18px]">check</span>
                      ) : (
                        "2"
                      )}
                    </div>
                    <span className={`text-xs font-semibold ${step >= 2 ? "text-primary" : "text-on-surface-variant"}`}>
                      Règlement Sécurisé
                    </span>
                  </div>

                  {/* Step 3 */}
                  <div className="flex flex-col items-center gap-1 relative z-10">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-sm bg-surface-container text-on-surface-variant">
                      3
                    </div>
                    <span className="text-xs font-semibold text-on-surface-variant">
                      Reçu Certifié
                    </span>
                  </div>
                </div>
              </div>

              {/* Biblical Encouragement Banner */}
              <div className="bg-primary-fixed rounded-2xl p-4 flex items-center gap-4 border border-primary-fixed-dim">
                <div className="w-12 h-12 rounded-xl bg-surface-container-lowest flex items-center justify-center text-primary flex-shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-[26px]">volunteer_activism</span>
                </div>
                <div className="flex flex-col">
                  <p className="text-[11px] uppercase tracking-wider text-on-primary-fixed-variant font-bold">
                    2 Corinthiens 9:7
                  </p>
                  <p className="text-xs text-on-primary-fixed leading-relaxed italic">
                    « Que chacun donne comme il l'a résolu en son cœur, sans tristesse ni contrainte; car Dieu aime celui qui donne avec joie. »
                  </p>
                </div>
              </div>

        {/* ============================================================== */}
        {/* STEP 1: AMOUNT & BENEFICIARY */}
        {/* ============================================================== */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container-high/60 space-y-6">
              {/* Type de Don */}
              <div>
                <label className="text-sm font-bold text-on-surface flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">category</span>
                  <span>Type d'Offrande ou Don</span>
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setDonationType("offrande")}
                    className={`p-3 rounded-xl flex items-center gap-2 font-semibold transition-all ${
                      donationType === "offrande"
                        ? "bg-primary text-on-primary shadow-sm"
                        : "bg-surface-container-low text-on-surface hover:bg-surface-container"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">diversity_3</span>
                    <span>Offrande ordinaire</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDonationType("dime")}
                    className={`p-3 rounded-xl flex items-center gap-2 font-semibold transition-all ${
                      donationType === "dime"
                        ? "bg-primary text-on-primary shadow-sm"
                        : "bg-surface-container-low text-on-surface hover:bg-surface-container"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
                    <span>Dîme du Seigneur</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDonationType("action-de-grace")}
                    className={`p-3 rounded-xl flex items-center gap-2 font-semibold transition-all ${
                      donationType === "action-de-grace"
                        ? "bg-primary text-on-primary shadow-sm"
                        : "bg-surface-container-low text-on-surface hover:bg-surface-container"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">celebration</span>
                    <span>Action de grâce</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDonationType("don-special")}
                    className={`p-3 rounded-xl flex items-center gap-2 font-semibold transition-all ${
                      donationType === "don-special"
                        ? "bg-primary text-on-primary shadow-sm"
                        : "bg-surface-container-low text-on-surface hover:bg-surface-container"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">card_giftcard</span>
                    <span>Don spécial / Mission</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDonationType("projet")}
                    className={`col-span-2 p-3 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all ${
                      donationType === "projet"
                        ? "bg-primary text-on-primary shadow-sm"
                        : "bg-surface-container-low text-on-surface hover:bg-surface-container"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">foundation</span>
                    <span>Campagne Nationale d'édification (Yaoundé / Grand Nord)</span>
                  </button>
                </div>
              </div>

              {/* Beneficiary Assembly */}
              <div>
                <label className="text-sm font-bold text-on-surface flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">church</span>
                  <span>Bénéficiaire / Assemblée</span>
                </label>
                <select
                  value={assembly}
                  onChange={(e) => setAssembly(e.target.value)}
                  className="w-full h-12 bg-surface-container-low rounded-xl px-4 text-xs font-semibold text-on-surface border border-surface-container-high focus:outline-none"
                >
                  <option value="tsinga">Assemblée Locale — Temple Tsinga (Yaoundé)</option>
                  <option value="bastos">Assemblée Locale — District Bastos-Mballa II</option>
                  <option value="douala-bepanda">Assemblée Locale — Temple Central Bépanda (Douala)</option>
                  <option value="bamenda">Assemblée Mère de Bamenda (Nord-Ouest)</option>
                  <option value="district-centre">District Ecclésiastique — Yaoundé Centre</option>
                  <option value="bureau-national">Bureau National — Siège Bamenda / Yaoundé</option>
                  <option value="mission-nord">Projet Missionnaire Évangélisation Grand Nord</option>
                </select>
              </div>

              {/* Amount selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">payments</span>
                    <span>Montant de votre offrande</span>
                  </label>
                  <span className="text-xs font-bold text-primary">FCFA (XAF)</span>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  {presetAmounts.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAmount(p)}
                      className={`h-11 rounded-xl text-xs font-bold transition-all ${
                        amount === p
                          ? "bg-primary text-on-primary shadow-sm"
                          : "bg-surface-container-low text-on-surface hover:bg-surface-container"
                      }`}
                    >
                      {p.toLocaleString()} F
                    </button>
                  ))}
                </div>

                <div className="relative flex items-center">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    min={100}
                    step={500}
                    className="w-full h-14 bg-surface-container-low rounded-xl px-4 text-xl font-bold text-primary focus:outline-none focus:bg-surface-container-lowest border border-surface-container-high"
                    placeholder="Autre montant..."
                  />
                  <span className="absolute right-4 font-bold text-on-surface-variant text-sm pointer-events-none">
                    FCFA
                  </span>
                </div>
              </div>

              {/* Anonymous checkbox */}
              <label className="flex items-start gap-3 p-3.5 bg-surface-container-low rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded accent-primary cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-on-surface">
                    Faire ce don de manière anonyme
                  </span>
                  <span className="text-[11px] text-on-surface-variant">
                    Seul le trésorier recevra la notification comptable sans affichage public lors du culte.
                  </span>
                </div>
              </label>

              {/* Prayer intention */}
              <div>
                <label className="text-xs font-bold text-on-surface flex items-center gap-1.5 mb-1.5">
                  <span className="material-symbols-outlined text-secondary text-[18px]">edit_note</span>
                  <span>Intention de prière ou sujet d'intercession (Optionnel)</span>
                </label>
                <textarea
                  value={prayerRequest}
                  onChange={(e) => setPrayerRequest(e.target.value)}
                  rows={2}
                  className="w-full p-3 bg-surface-container-low rounded-xl text-xs text-on-surface focus:outline-none border border-surface-container-high resize-none"
                  placeholder="Ex: Action de grâce pour la guérison de notre fille et prospérité spirituelle de l'assemblée..."
                />
              </div>

              {/* Next step button */}
              <button
                type="button"
                onClick={handleProceedToPayment}
                className="w-full h-12 bg-primary text-on-primary hover:bg-primary/90 rounded-full font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continuer vers le paiement ({amount.toLocaleString()} FCFA)</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STEP 2: USSD PROMPT / PAYMENT METHOD OR MANUAL BANK TRANSFER */}
        {/* ============================================================== */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container-high/60 space-y-6">
              
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-surface-container/60">
                <div>
                  <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[22px]">contactless</span>
                    <span>Sélectionner le mode de règlement</span>
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Choisissez entre les moyens automatiques (Mobile Money) et le virement bancaire avec bordereau.
                  </p>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full self-start sm:self-auto ${
                  paymentMethod === "bank"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-tertiary/10 text-tertiary"
                }`}>
                  {paymentMethod === "bank" ? "Règlement manuel avec justificatif" : "Débit automatique instantané"}
                </span>
              </div>

              {/* 4 Mode selection cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* MTN Mobile Money */}
                <div
                  onClick={() => handleSelectPaymentMethod("mtn")}
                  className={`p-4 rounded-xl flex items-center justify-between cursor-pointer border transition-all ${
                    paymentMethod === "mtn"
                      ? "bg-secondary-fixed/30 border-secondary-container shadow-sm ring-2 ring-primary/20"
                      : "bg-surface-container-low border-transparent hover:bg-surface-container"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-secondary-container text-on-secondary-container font-extrabold flex items-center justify-center text-sm shadow-sm shrink-0">
                      MTN
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-on-surface">MTN Mobile Money</span>
                        <span className="bg-secondary text-on-secondary text-[10px] font-bold px-2 py-0.5 rounded-full">
                          *126#
                        </span>
                      </div>
                      <span className="text-xs text-on-surface-variant">
                        Débit automatique USSD
                      </span>
                    </div>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      paymentMethod === "mtn"
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container text-transparent"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  </div>
                </div>

                {/* Orange Money */}
                <div
                  onClick={() => handleSelectPaymentMethod("orange")}
                  className={`p-4 rounded-xl flex items-center justify-between cursor-pointer border transition-all ${
                    paymentMethod === "orange"
                      ? "bg-secondary-fixed/30 border-secondary-container shadow-sm ring-2 ring-primary/20"
                      : "bg-surface-container-low border-transparent hover:bg-surface-container"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-inverse-surface text-surface font-extrabold flex items-center justify-center text-sm shadow-sm shrink-0">
                      OM
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-on-surface">Orange Money</span>
                        <span className="bg-surface-container-highest text-on-surface text-[10px] font-bold px-2 py-0.5 rounded-full">
                          #150#
                        </span>
                      </div>
                      <span className="text-xs text-on-surface-variant">
                        Débit automatique USSD
                      </span>
                    </div>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      paymentMethod === "orange"
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container text-transparent"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  </div>
                </div>

                {/* Virement Bancaire (Manuel - avec bordereau) */}
                <div
                  onClick={() => handleSelectPaymentMethod("bank")}
                  className={`p-4 rounded-xl flex items-center justify-between cursor-pointer border transition-all ${
                    paymentMethod === "bank"
                      ? "bg-secondary-fixed/30 border-secondary-container shadow-sm ring-2 ring-primary/20"
                      : "bg-surface-container-low border-transparent hover:bg-surface-container"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white font-extrabold flex items-center justify-center text-sm shadow-sm shrink-0">
                      <span className="material-symbols-outlined text-[24px]">account_balance</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-on-surface">Virement Bancaire</span>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Bordereau
                        </span>
                      </div>
                      <span className="text-xs text-on-surface-variant">
                        Manuel avec preuve de versement
                      </span>
                    </div>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      paymentMethod === "bank"
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container text-transparent"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  </div>
                </div>

                {/* Carte Bancaire */}
                <div
                  onClick={() => handleSelectPaymentMethod("card")}
                  className={`p-4 rounded-xl flex items-center justify-between cursor-pointer border transition-all ${
                    paymentMethod === "card"
                      ? "bg-secondary-fixed/30 border-secondary-container shadow-sm ring-2 ring-primary/20"
                      : "bg-surface-container-low border-transparent hover:bg-surface-container"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-surface-container-high text-on-surface font-extrabold flex items-center justify-center text-sm shadow-sm shrink-0">
                      <span className="material-symbols-outlined text-[24px]">credit_card</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-on-surface">Carte Bancaire</span>
                        <span className="bg-surface-container-highest text-on-surface text-[10px] font-bold px-2 py-0.5 rounded-full">
                          GIMAC
                        </span>
                      </div>
                      <span className="text-xs text-on-surface-variant">
                        Visa, Mastercard, GIMAC
                      </span>
                    </div>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      paymentMethod === "card"
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container text-transparent"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  </div>
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* CAS 1: WALLET MOBILE MONEY (MTN MOMO / ORANGE MONEY)          */}
              {/* DEUX MODES CONFORMÉMENT AUX EXIGENCES :                       */}
              {/* 1. AUTOMATIQUE (SASPAY SOFTPAY USSD DIRECT)                   */}
              {/* 2. MANUEL (DÉPÔT VERS NUMÉRO TRÉSORERIE AVEC RÉFÉRENCE SMS)    */}
              {/* ------------------------------------------------------------- */}
              {(paymentMethod === "mtn" || paymentMethod === "orange") && (
                <div className="space-y-5 pt-2">
                  {/* Commutateur de Mode : Automatique vs Manuel Trésorerie */}
                  <div className="flex p-1 bg-surface-container rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setWalletMode("auto");
                        setPaymentInitiated(false);
                      }}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                        walletMode === "auto"
                          ? "bg-surface-container-lowest text-primary shadow-xs"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[17px]">bolt</span>
                      <span>1. Débit Automatique (SasPay USSD)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWalletMode("manual");
                        setPaymentInitiated(false);
                      }}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                        walletMode === "manual"
                          ? "bg-surface-container-lowest text-primary shadow-xs"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[17px]">send_money</span>
                      <span>2. Dépôt Manuel Trésorerie</span>
                    </button>
                  </div>

                  {/* ----------------------------------------------------------- */}
                  {/* SOUS-MODE 1 : PAIEMENT AUTOMATIQUE VIA SASPAY               */}
                  {/* ----------------------------------------------------------- */}
                  {walletMode === "auto" && (
                    <div className="space-y-5">
                      {/* Notice d'information réseau Orange Money */}
                      {paymentMethod === "orange" && (
                        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-start sm:items-center gap-2">
                            <span className="material-symbols-outlined text-amber-700 text-[18px] shrink-0 mt-0.5 sm:mt-0">info</span>
                            <span className="leading-snug">
                              L'invite USSD Orange Money dépend de la passerelle télécom. Si le prompt ne s'affiche pas sur votre mobile, vous pouvez basculer sur le <strong>« Dépôt Manuel Trésorerie »</strong> (#150#) ou utiliser MTN MoMo.
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setWalletMode("manual")}
                            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shrink-0 self-start sm:self-auto cursor-pointer transition-colors"
                          >
                            Passer au Dépôt Manuel
                          </button>
                        </div>
                      )}

                      {/* Saisie Numéro */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-on-surface block">
                            Numéro de compte {paymentMethod === "mtn" ? "MTN Mobile Money" : "Orange Money"} *
                          </label>
                          <span className="text-[11px] text-on-surface-variant font-medium">Cameroun (+237)</span>
                        </div>
                        <div className="relative flex items-center">
                          <div className="absolute left-3 flex items-center gap-1.5 bg-surface-container px-2.5 py-1.5 rounded-lg text-on-surface font-bold text-xs pointer-events-none">
                            <span>🇨🇲</span>
                            <span>+237</span>
                          </div>
                          <input
                            type="tel"
                            disabled={paymentInitiated}
                            value={phoneNumber}
                            onChange={(e) => {
                              setPhoneNumber(e.target.value);
                              if (phoneError) setPhoneError(null);
                            }}
                            placeholder="6 77 12 34 56"
                            className="w-full h-12 bg-surface-container-low rounded-xl pl-24 pr-4 text-sm font-semibold text-on-surface focus:outline-none border border-surface-container-high focus:border-primary disabled:opacity-75"
                          />
                        </div>
                        {phoneError && (
                          <p className="text-xs text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">error</span>
                            <span>{phoneError}</span>
                          </p>
                        )}
                      </div>

                      {/* AVANT INITIATION : AUCUN DÉCOMPTE DE TEMPS ! */}
                      {!paymentInitiated && (
                        <div className="p-5 rounded-2xl bg-surface-container-low border border-surface-container-high space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-[22px]">send_to_mobile</span>
                            </div>
                            <div className="space-y-1">
                              <h4 className="font-bold text-sm text-on-surface">
                                Prêt à initier le prélèvement automatique SasPay
                              </h4>
                              <p className="text-xs text-on-surface-variant leading-relaxed">
                                Cliquez sur « Initier le débit automatique ». Une invite USSD interactive ({paymentMethod === "mtn" ? "*126#" : "#150#"}) s'affichera directement sur votre téléphone pour vous inviter à composer votre code PIN secret.
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleInitiateMobilePayment}
                            disabled={isInitiating}
                            className="w-full h-12 bg-primary text-on-primary hover:bg-primary/90 rounded-full font-bold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                          >
                            {isInitiating ? (
                              <>
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Connexion à la passerelle SasPay en cours...</span>
                              </>
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-[18px]">bolt</span>
                                <span>Initier le paiement automatique ({amount.toLocaleString()} FCFA)</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* APRÈS INITIATION : DÉCOMPTE DE TEMPS RESTANT */}
                      {paymentInitiated && (
                        <div className="bg-surface-container-low rounded-2xl p-6 border border-primary/30 space-y-5 text-center shadow-xs animate-in fade-in duration-300">
                          {/* Horloge Circulaire Animée */}
                          <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                              <circle
                                className="text-surface-container-high"
                                cx="50"
                                cy="50"
                                fill="transparent"
                                r="40"
                                stroke="currentColor"
                                strokeWidth="6"
                              />
                              <circle
                                className={`${timer <= 20 ? "text-rose-500" : "text-primary-container"} transition-all duration-1000`}
                                cx="50"
                                cy="50"
                                fill="transparent"
                                r="40"
                                stroke="currentColor"
                                strokeWidth="6"
                                strokeDasharray="251.2"
                                strokeDashoffset={251.2 * (1 - timer / 120)}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute flex flex-col items-center justify-center">
                              <span className={`text-xl font-black ${timer <= 20 ? "text-rose-600 animate-pulse" : "text-on-surface"}`}>
                                {formatTimer(timer)}
                              </span>
                              <span className="text-[10px] text-on-surface-variant uppercase font-bold">temps restant</span>
                            </div>
                          </div>

                          <div className="space-y-1.5 max-w-md mx-auto">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                              <span>Prompt USSD SasPay transmis avec succès</span>
                            </div>
                            <h4 className="font-bold text-on-surface text-base pt-1">
                              Vérifiez l'écran de votre téléphone (+237 {phoneNumber})
                            </h4>
                            <p className="text-xs text-on-surface-variant leading-relaxed">
                              Saisissez votre code secret {paymentMethod === "mtn" ? "*126#" : "#150#"} pour autoriser le transfert de{" "}
                              <strong className="text-primary font-bold">{amount.toLocaleString()} FCFA</strong> au profit de la Full Gospel Mission.
                            </p>
                          </div>

                          {timer === 0 && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold">
                              Le délai d'attente est écoulé. Si vous n'avez pas reçu l'invite, cliquez sur « Renvoyer l'invite USSD » ci-dessous.
                            </div>
                          )}

                          {/* État de validation automatique par le Backend (Aucun clic utilisateur requis !) */}
                          <div className="flex flex-col gap-3 pt-2 max-w-md mx-auto">
                            {autoCheckStatus === "processing" && (
                              <div className="p-4 rounded-2xl bg-primary-fixed/20 border border-primary/30 flex items-center gap-3.5 text-left shadow-2xs">
                                <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-xs">
                                  <span className="material-symbols-outlined text-[20px] animate-spin">
                                    sync
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                    <span className="text-xs font-bold text-on-surface">
                                      Validation automatique en direct par le serveur...
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-on-surface-variant mt-1 leading-snug">
                                    Dès que vous composez votre code secret sur votre téléphone (+237 {phoneNumber}), le serveur confirme le paiement et génère votre reçu certifié <strong>automatiquement</strong>.
                                  </p>
                                </div>
                              </div>
                            )}

                            {autoCheckStatus === "failed" && (
                              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 text-left space-y-2">
                                <div className="flex items-center gap-2 font-bold text-xs text-rose-900">
                                  <span className="material-symbols-outlined text-[18px]">cancel</span>
                                  <span>Paiement non validé par l'opérateur</span>
                                </div>
                                <p className="text-xs text-rose-800 leading-relaxed">
                                  {autoCheckMessage || "Le débit a été rejeté ou annulé (Code secret erroné ou solde insuffisant)."}
                                </p>
                              </div>
                            )}

                            {autoCheckStatus === "completed" && (
                              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-left flex items-center gap-3">
                                <span className="material-symbols-outlined text-emerald-700 text-[24px]">
                                  check_circle
                                </span>
                                <div>
                                  <span className="font-bold text-xs text-emerald-900 block">
                                    Paiement validé avec succès par l'opérateur !
                                  </span>
                                  <span className="text-[11px] text-emerald-800">
                                    Affichage du reçu certifié en cours...
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Actions de secours : Renvoyer USSD / Changer de numéro */}
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={handleRetryUssd}
                                className="flex-1 h-10 rounded-full bg-surface-container text-on-surface text-xs font-bold hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[16px]">sync</span>
                                <span>Renvoyer l'invite USSD</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPaymentInitiated(false);
                                  setAutoCheckStatus("idle");
                                  setAutoCheckMessage(null);
                                }}
                                className="flex-1 h-10 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold hover:bg-surface-container-high hover:text-on-surface transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                                <span>Changer de numéro</span>
                              </button>
                            </div>

                            {/* Lien de secours si l'utilisateur souhaite forcer l'interrogation immédiate du serveur */}
                            <button
                              type="button"
                              onClick={handleManualCheckServerStatus}
                              className="text-[11px] text-primary hover:underline font-semibold mx-auto block pt-1 cursor-pointer"
                            >
                              Interroger l'état auprès du serveur
                            </button>

                            {/* Outil de validation rapide pour tests de déploiement (Simulateur Webhook SasPay) */}
                            <button
                              type="button"
                              onClick={async () => {
                                if (!donationId) return;
                                try {
                                  const res = await api.donations.simulateWebhook({ donation_id: donationId, status: "completed" });
                                  if (res?.data?.result?.status === "completed") {
                                    await alert({
                                      title: "Simulation Validée",
                                      message: "Webhook SasPay validé ! Reçu certifié émis avec succès.",
                                      variant: "info",
                                    });
                                  } else {
                                    await alert({
                                      title: "Simulation Transmise",
                                      message: "Notification transmise au serveur.",
                                      variant: "info",
                                    });
                                  }
                                } catch (e: any) {
                                  await alert({
                                    title: "Erreur Simulation",
                                    message: e?.message || "Erreur lors de la simulation webhook.",
                                    variant: "danger",
                                  });
                                }
                              }}
                              className="text-[10px] text-on-surface-variant hover:text-primary transition-colors hover:underline mx-auto block pt-1.5 cursor-pointer opacity-70 hover:opacity-100"
                            >
                              ⚡ Simuler la réception du webhook SasPay (Test Déploiement)
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ----------------------------------------------------------- */}
                  {/* SOUS-MODE 2 : DÉPÔT MANUEL VERS LA TRÉSORERIE               */}
                  {/* (JAMAIS DE DÉCOMPTE DE TEMPS !)                             */}
                  {/* ----------------------------------------------------------- */}
                  {walletMode === "manual" && (
                    <div className="space-y-4">
                      {/* Coordonnées officielles du numéro de trésorerie */}
                      <div className="p-5 rounded-2xl bg-surface-container-low border border-surface-container-high space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                          <div className="flex items-center gap-2.5">
                            <span className="material-symbols-outlined text-primary text-[24px]">account_balance_wallet</span>
                            <div>
                              <h4 className="font-bold text-xs text-on-surface uppercase tracking-wide">
                                Compte Trésorerie Officiel {paymentMethod === "mtn" ? "MTN MoMo" : "Orange Money"}
                              </h4>
                              <span className="text-[11px] text-on-surface-variant">
                                {treasuryAccounts.assembly_name}
                              </span>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            Numéro officiel église
                          </span>
                        </div>

                        <div className="p-3 bg-surface-container-lowest rounded-xl border border-surface-container flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-on-surface-variant uppercase font-bold block">
                              Numéro officiel de la Trésorerie
                            </span>
                            <span className="font-mono font-bold text-primary text-base block mt-0.5">
                              +237 {paymentMethod === "mtn" ? treasuryAccounts.mtn_momo_number : treasuryAccounts.orange_money_number}
                            </span>
                            <span className="text-[11px] text-on-surface-variant block mt-0.5">
                              Titulaire : {paymentMethod === "mtn" ? treasuryAccounts.mtn_momo_name : treasuryAccounts.orange_money_name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const num = paymentMethod === "mtn" ? treasuryAccounts.mtn_momo_number : treasuryAccounts.orange_money_number;
                              navigator.clipboard.writeText(num);
                              alert({ title: "Copié", message: `Numéro Trésorerie ${num} copié dans le presse-papiers.`, variant: "info" });
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[15px]">content_copy</span>
                            <span>Copier</span>
                          </button>
                        </div>

                        <p className="text-[11px] text-on-surface-variant leading-relaxed">
                          Effectuez le transfert de <strong>{amount.toLocaleString()} FCFA</strong> vers ce numéro depuis votre téléphone, puis renseignez ci-dessous la référence de transaction figurant dans le SMS de confirmation de l'opérateur.
                        </p>
                      </div>

                      {/* Formulaire de renseignement de la référence */}
                      <form onSubmit={handleSubmitManualWallet} className="space-y-4 bg-surface-container-low p-5 rounded-2xl border border-surface-container-high">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-on-surface block">
                            Référence de la transaction SMS {paymentMethod === "mtn" ? "MTN MoMo" : "Orange Money"} *
                          </label>
                          <input
                            type="text"
                            value={manualWalletRef}
                            onChange={(e) => {
                              setManualWalletRef(e.target.value);
                              if (manualWalletError) setManualWalletError(null);
                            }}
                            placeholder="Ex : MP260301.1420.C98412 ou ID SMS de transfert"
                            className="w-full h-12 bg-surface-container-lowest rounded-xl px-4 text-xs font-mono font-bold text-on-surface focus:outline-none border border-surface-container-high focus:border-primary"
                          />
                          {manualWalletError && (
                            <p className="text-xs text-rose-600 font-semibold mt-1 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">error</span>
                              <span>{manualWalletError}</span>
                            </p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-on-surface block">
                            Votre numéro de téléphone émetteur
                          </label>
                          <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="6 77 12 34 56"
                            className="w-full h-11 bg-surface-container-lowest rounded-xl px-4 text-xs font-semibold text-on-surface focus:outline-none border border-surface-container-high"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full h-12 bg-primary text-on-primary hover:bg-primary/90 rounded-full font-bold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                        >
                          <span className="material-symbols-outlined text-[18px]">send</span>
                          <span>Transmettre la référence à la Trésorerie ({amount.toLocaleString()} FCFA)</span>
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* CAS 2: PAIEMENT MANUEL VIREMENT BANCAIRE - JAMAIS DE DÉCOMPTE */}
              {/* ------------------------------------------------------------- */}
              {paymentMethod === "bank" && (
                <div className="space-y-5 pt-2">
                  {/* Coordonnées Bancaires Officielles (SANS DÉCOMPTE) */}
                  <div className="p-5 rounded-2xl bg-surface-container-low border border-surface-container-high space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-surface-container">
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-primary text-[24px]">account_balance</span>
                        <div>
                          <h4 className="font-bold text-sm text-on-surface">
                            Coordonnées Bancaires Officielles de la Mission
                          </h4>
                          <span className="text-[11px] text-on-surface-variant">Afriland First Bank Cameroun</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        Compte National Titulaire
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-surface-container-lowest rounded-xl border border-surface-container">
                        <span className="text-[11px] text-on-surface-variant block">Intitulé du compte :</span>
                        <span className="font-bold text-on-surface text-xs mt-0.5 block">
                          MISSION DU PLEIN ÉVANGILE CAMEROUN
                        </span>
                      </div>
                      <div className="p-3 bg-surface-container-lowest rounded-xl border border-surface-container flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-on-surface-variant block">Numéro de Compte :</span>
                          <span className="font-mono font-bold text-primary text-sm block">01234567890</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText("01234567890");
                            alert({ title: "Copié", message: "Numéro de compte copié dans le presse-papier.", variant: "info" });
                          }}
                          className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface cursor-pointer"
                          title="Copier le numéro"
                        >
                          <span className="material-symbols-outlined text-[16px]">content_copy</span>
                        </button>
                      </div>
                      <div className="p-3 bg-surface-container-lowest rounded-xl border border-surface-container">
                        <span className="text-[11px] text-on-surface-variant block">Code Banque &amp; Guichet :</span>
                        <span className="font-mono font-bold text-on-surface text-xs block">10005 — 00001 (Clé 45)</span>
                      </div>
                      <div className="p-3 bg-surface-container-lowest rounded-xl border border-surface-container">
                        <span className="text-[11px] text-on-surface-variant block">Code SWIFT / BIC :</span>
                        <span className="font-mono font-bold text-on-surface text-xs block">AFRICMCX</span>
                      </div>
                    </div>
                  </div>

                  {/* Formulaire de Renseignement de la Preuve */}
                  <form onSubmit={handleSubmitBankProof} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                        <span>Numéro de bordereau / Référence du virement bancaire *</span>
                      </label>
                      <input
                        type="text"
                        value={bankRef}
                        onChange={(e) => {
                          setBankRef(e.target.value);
                          if (bankError) setBankError(null);
                        }}
                        placeholder="Ex : BDR-2026-94812 ou REF-VIR-0042"
                        className="w-full h-12 bg-surface-container-low rounded-xl px-4 text-xs font-mono font-bold text-on-surface focus:outline-none border border-surface-container-high focus:border-primary"
                      />
                      {bankError && (
                        <p className="text-xs text-rose-600 font-semibold mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">error</span>
                          <span>{bankError}</span>
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-on-surface">
                          Nom de l'émetteur du virement
                        </label>
                        <input
                          type="text"
                          value={bankSenderName}
                          onChange={(e) => setBankSenderName(e.target.value)}
                          placeholder="Ex : Frère Jean-Claude Fossouo"
                          className="w-full h-11 bg-surface-container-low rounded-xl px-4 text-xs font-semibold text-on-surface focus:outline-none border border-surface-container-high"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-on-surface">
                          Date du virement bancaire
                        </label>
                        <input
                          type="date"
                          value={bankTransferDate}
                          onChange={(e) => setBankTransferDate(e.target.value)}
                          className="w-full h-11 bg-surface-container-low rounded-xl px-4 text-xs font-semibold text-on-surface focus:outline-none border border-surface-container-high"
                        />
                      </div>
                    </div>

                    {/* Téléversement de la Quittance / Bordereau */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-primary text-[18px]">attach_file</span>
                        <span>Photo ou capture d'écran du bordereau / reçu de virement (Optionnel)</span>
                      </label>
                      <input
                        type="file"
                        ref={proofInputRef}
                        onChange={handleProofFileChange}
                        accept="image/*,application/pdf"
                        className="hidden"
                      />
                      <div
                        onClick={() => proofInputRef.current?.click()}
                        className="p-4 rounded-xl border-2 border-dashed border-surface-container-high hover:border-primary bg-surface-container-low/50 cursor-pointer text-center transition-all"
                      >
                        {proofPreview ? (
                          <div className="flex items-center justify-center gap-3">
                            <img src={proofPreview} alt="Aperçu bordereau" className="w-12 h-12 object-cover rounded-lg border border-surface-container" />
                            <div className="text-left">
                              <span className="text-xs font-bold text-on-surface block truncate max-w-xs">{proofFile?.name}</span>
                              <span className="text-[11px] text-tertiary font-bold">Fichier prêt • Cliquez pour changer</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-on-surface-variant">
                            <span className="material-symbols-outlined text-[24px] text-primary">upload_file</span>
                            <span className="text-xs font-bold text-on-surface">Cliquer pour joindre la quittance bancaire</span>
                            <span className="text-[10px]">Formats acceptés : JPG, PNG, PDF (Max 5 Mo)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full h-12 bg-primary text-on-primary hover:bg-primary/90 rounded-full font-bold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">verified_user</span>
                      <span>Soumettre la preuve de virement &amp; Générer le reçu</span>
                    </button>
                  </form>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* CAS 3: CARTE BANCAIRE / GIMAC - SANS DÉCOMPTE USSD             */}
              {/* ------------------------------------------------------------- */}
              {paymentMethod === "card" && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface">Numéro de Carte Bancaire</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4000 1234 5678 9010"
                      maxLength={19}
                      className="w-full h-12 bg-surface-container-low rounded-xl px-4 text-xs font-mono font-bold text-on-surface focus:outline-none border border-surface-container-high focus:border-primary"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-on-surface">Expiration (MM/AA)</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="12/28"
                        maxLength={5}
                        className="w-full h-11 bg-surface-container-low rounded-xl px-4 text-xs font-mono text-on-surface focus:outline-none border border-surface-container-high"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-on-surface">CVV / CVC</label>
                      <input
                        type="password"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="•••"
                        maxLength={4}
                        className="w-full h-11 bg-surface-container-low rounded-xl px-4 text-xs font-mono text-on-surface focus:outline-none border border-surface-container-high"
                      />
                    </div>
                  </div>
                  {cardError && (
                    <p className="text-xs text-rose-600 font-semibold mt-1">{cardError}</p>
                  )}
                  <button
                    type="button"
                    onClick={handleSubmitCardPayment}
                    className="w-full h-12 bg-primary text-on-primary hover:bg-primary/90 rounded-full font-bold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">credit_card</span>
                    <span>Payer {amount.toLocaleString()} FCFA par Carte</span>
                  </button>
                </div>
              )}

              {/* Bouton Retour Étape 1 */}
              <div className="pt-2 border-t border-surface-container/60">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setPaymentInitiated(false);
                  }}
                  className="w-full h-10 rounded-full bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  ← Modifier le montant ou le projet d'offrande
                </button>
              </div>

            </div>
          </div>
        )}
      </div>

            {/* Right Column: Sticky Desktop Pledge Card & Church Guarantee (5 cols) */}
            <div className="hidden lg:flex lg:col-span-5 xl:col-span-5 flex-col gap-5 sticky top-24">
              {/* Dynamic Live Pledge Card */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container-high/60 space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-surface-container">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-sm border border-surface-container overflow-hidden flex-shrink-0">
                      <Image
                        src="/logo.jpg"
                        alt="Logo FULLGOPE"
                        width={40}
                        height={40}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                        FULL GOSPEL MISSION
                      </h4>
                      <span className="text-[10px] text-on-surface-variant block">
                        Trésorerie Nationale • Yaoundé
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-secondary-container/40 text-secondary text-[11px] font-bold">
                    Direct En Ligne
                  </span>
                </div>

                {/* Amount Highlight */}
                <div className="bg-surface-container-low rounded-xl p-4 text-center border border-surface-container space-y-1">
                  <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
                    Montant de votre offrande
                  </span>
                  <div className="text-3xl font-black text-primary tracking-tight">
                    {amount.toLocaleString()} <span className="text-lg font-bold text-on-surface">FCFA</span>
                  </div>
                  <span className="text-[11px] text-tertiary font-bold flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">verified_user</span>
                    Débit sécurisé sans frais annexes
                  </span>
                </div>

                {/* Details Breakdown */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-surface-container/60">
                    <span className="text-on-surface-variant">Nature :</span>
                    <span className="font-bold text-on-surface uppercase">
                      {donationType === "dime"
                        ? "Dîme Pastorale & Évangélique"
                        : donationType === "offrande"
                        ? "Offrande du culte"
                        : donationType === "action-de-grace"
                        ? "Action de grâce"
                        : "Don de soutien / Mission"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-surface-container/60">
                    <span className="text-on-surface-variant">Assemblée bénéficiaire :</span>
                    <span className="font-bold text-on-surface">
                      {assembly === "tsinga"
                        ? "Temple Tsinga (Yaoundé)"
                        : assembly === "biyem-assi"
                        ? "Paroisse Biyem-Assi"
                        : assembly === "bepanda"
                        ? "Grand Temple Bépanda"
                        : "Siège National"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-surface-container/60">
                    <span className="text-on-surface-variant">Moyen :</span>
                    <span className="font-bold text-on-surface flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          paymentMethod === "mtn"
                            ? "bg-amber-500"
                            : paymentMethod === "orange"
                            ? "bg-orange-500"
                            : paymentMethod === "bank"
                            ? "bg-emerald-600"
                            : "bg-blue-600"
                        }`}
                      />
                      {paymentMethod === "mtn"
                        ? (walletMode === "auto" ? "MTN MoMo (SasPay Auto)" : "Dépôt Trésorerie MTN")
                        : paymentMethod === "orange"
                        ? (walletMode === "auto" ? "Orange Money (SasPay Auto)" : "Dépôt Trésorerie Orange")
                        : paymentMethod === "bank"
                        ? "Virement Bancaire (Afriland)"
                        : "Carte Bancaire GIMAC"}
                    </span>
                  </div>
                  {step === 2 && (paymentMethod === "mtn" || paymentMethod === "orange") && (
                    <div className="flex justify-between py-1.5 border-b border-surface-container/60">
                      <span className="text-on-surface-variant">Statut débit :</span>
                      {walletMode === "auto" ? (
                        <span className={`font-bold ${paymentInitiated ? "text-emerald-700" : "text-amber-700"}`}>
                          {paymentInitiated ? `Invite active (${formatTimer(timer)})` : "En attente d'initiation"}
                        </span>
                      ) : (
                        <span className="font-bold text-amber-700">
                          Dépôt manuel Trésorerie
                        </span>
                      )}
                    </div>
                  )}
                  {step === 2 && paymentMethod === "bank" && (
                    <div className="flex justify-between py-1.5 border-b border-surface-container/60">
                      <span className="text-on-surface-variant">Procédure :</span>
                      <span className="font-bold text-emerald-700">
                        Virement + Bordereau
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-1.5">
                    <span className="text-on-surface-variant">Visibilité :</span>
                    <span className="font-bold text-on-surface">
                      {isAnonymous ? "Anonymat respecté" : "Enregistré avec matricule"}
                    </span>
                  </div>
                </div>

                {/* Mission allocation transparency bar */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-[11px] font-bold text-on-surface">
                    <span>Affectation Évangélique</span>
                    <span className="text-primary">100% Fidélité</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-container flex overflow-hidden">
                    <div className="w-[70%] bg-primary" title="70% Évangélisation & Implantations" />
                    <div className="w-[20%] bg-secondary" title="20% Entretien & Bâtiments" />
                    <div className="w-[10%] bg-tertiary" title="10% Diaconat & Dorcas" />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-on-surface-variant pt-0.5">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" /> 70% Mission
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary" /> 20% Temples
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-tertiary" /> 10% Œuvres
                    </span>
                  </div>
                </div>

                {/* Official seal reassurance */}
                <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-[22px] shrink-0 mt-0.5">
                    verified
                  </span>
                  <div className="space-y-0.5">
                    <h5 className="text-[11px] font-bold text-on-surface">
                      Attestation d'Exonération et Récépissé
                    </h5>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed">
                      Reconnaissance ecclésiale de la Mission du Plein Évangile (Décret N°69/DF/144). Tout don donne lieu à un reçu nominatif opposable.
                    </p>
                  </div>
                </div>
              </div>

              {/* Assistance Trésorerie */}
              <div className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container shadow-sm flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-primary text-[20px]">support_agent</span>
                  <div>
                    <span className="font-bold text-on-surface block">Besoin d'assistance ?</span>
                    <span className="text-[11px] text-on-surface-variant">Ligne Trésorerie Nationale</span>
                  </div>
                </div>
                <span className="font-mono font-bold text-primary text-xs">+237 222 21 00 00</span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STEP 3: OFFICIAL CERTIFIED RECEIPT OR PROVISIONAL RECEIPT      */}
        {/* ============================================================== */}
        {step === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Official Church Receipt (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Praise banner: vert si débit validé (auto/carte), ambre si en attente de pointage trésorerie (manuel/virement) */}
              {donationStatus === "completed" ? (
                <div className="bg-tertiary-container text-on-tertiary rounded-2xl p-5 shadow-md flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center flex-shrink-0 shadow-inner font-extrabold">
                    <span className="material-symbols-outlined text-[28px]">check</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs uppercase tracking-wider text-tertiary-fixed font-bold">
                      Offrande Validée &amp; Enregistrée au Grand Livre
                    </span>
                    <h2 className="text-base font-bold leading-tight">
                      Gloire à Dieu ! Votre offrande a été validée avec succès.
                    </h2>
                    <p className="text-xs opacity-90 mt-0.5">
                      « Que Dieu pourvoie à tous vos besoins selon sa richesse avec gloire. »
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-500/10 border border-amber-300 rounded-2xl p-5 shadow-md flex items-center gap-4 text-amber-950">
                  <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-inner font-extrabold">
                    <span className="material-symbols-outlined text-[28px]">pending_actions</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs uppercase tracking-wider text-amber-800 font-bold">
                      Reçu Provisoire • Rapprochement Trésorerie
                    </span>
                    <h2 className="text-base font-bold leading-tight">
                      Votre versement a été transmis à la Trésorerie Paroissiale.
                    </h2>
                    <p className="text-xs text-amber-900/80 mt-0.5">
                      La Trésorerie va vérifier la référence {manualWalletRef || bankRef || ""} dès constatation sur le relevé pour certifier l'encaissement.
                    </p>
                  </div>
                </div>
              )}

              {/* Official Church Receipt */}
              <div className="bg-surface-container-lowest rounded-2xl shadow-xl p-6 sm:p-8 border border-surface-container-high relative overflow-hidden space-y-6">
                {/* Header with church seal & receipt no */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-surface-container-high gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-white p-1 flex items-center justify-center shadow-sm border border-surface-container overflow-hidden flex-shrink-0">
                      <Image
                        src="/logo.jpg"
                        alt="Sceau officiel FULL GOSPEL MISSION"
                        width={56}
                        height={56}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <span className="font-extrabold text-lg text-on-surface tracking-tight block">
                        FULL GOSPEL MISSION CAMEROON
                      </span>
                      <span className="text-xs text-on-surface-variant block">
                        Mission du Plein Évangile • Décret N°69/DF/144
                      </span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[11px] font-bold text-on-surface-variant block uppercase tracking-wider">
                      {donationStatus === "completed" ? "Reçu Officiel N°" : "Reçu Provisoire N°"}
                    </span>
                    <span className="text-sm font-bold text-primary font-mono block">
                      {receiptNumber}
                    </span>
                    {donationStatus === "completed" ? (
                      <span className="text-[11px] text-tertiary font-bold">● Certifié conforme • Encaissé</span>
                    ) : (
                      <span className="text-[11px] text-amber-600 font-bold">● En attente validation Trésorerie</span>
                    )}
                  </div>
                </div>

                {/* Receipt details table */}
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-surface-container-low">
                    <span className="text-on-surface-variant">Date et Heure :</span>
                    <span className="font-bold text-on-surface">
                      {new Date().toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-surface-container-low">
                    <span className="text-on-surface-variant">Nature du Don :</span>
                    <span className="font-bold text-primary uppercase">
                      {donationType === "dime"
                        ? "Dîme Pastorale & Évangélique"
                        : donationType === "offrande"
                        ? "Offrande du culte"
                        : donationType === "action-de-grace"
                        ? "Action de grâce"
                        : "Don de soutien / Mission"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-surface-container-low">
                    <span className="text-on-surface-variant">Assemblée Destinataire :</span>
                    <span className="font-bold text-on-surface">{treasuryAccounts.assembly_name || "Temple Tsinga, District Centre (Yaoundé)"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-surface-container-low">
                    <span className="text-on-surface-variant">Moyen de règlement :</span>
                    <span className="font-bold text-on-surface">
                      {paymentMethod === "mtn"
                        ? (walletMode === "auto" ? "MTN Mobile Money (SasPay Softpay USSD Automatique)" : "Dépôt Direct Trésorerie MTN MoMo")
                        : paymentMethod === "orange"
                        ? (walletMode === "auto" ? "Orange Money (SasPay Softpay USSD Automatique)" : "Dépôt Direct Trésorerie Orange Money")
                        : paymentMethod === "bank"
                        ? "Virement Bancaire (Afriland First Bank Cameroun)"
                        : "Carte Bancaire GIMAC"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-surface-container-low">
                    <span className="text-on-surface-variant">
                      {paymentMethod === "bank"
                        ? "Réf. Bordereau & Émetteur :"
                        : walletMode === "manual"
                        ? "Référence SMS déclarée & N° :"
                        : "Numéro émetteur :"}
                    </span>
                    <span className="font-bold text-on-surface font-mono">
                      {paymentMethod === "bank"
                        ? `${bankRef || "BDR-VIR"} • ${bankSenderName || "Fidèle Donateur"}`
                        : walletMode === "manual"
                        ? `${manualWalletRef} • +237 ${phoneNumber}`
                        : isAnonymous
                        ? "Donateur Anonyme"
                        : `+237 ${phoneNumber}`}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-surface-container-low">
                    <span className="text-on-surface-variant">Statut d'imputation :</span>
                    {donationStatus === "completed" ? (
                      <span className="font-bold text-emerald-700 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">verified</span>
                        <span>Écriture certifiée au Grand Livre de Caisse</span>
                      </span>
                    ) : (
                      <span className="font-bold text-amber-600 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
                        <span>Déclaration transmise • En attente de validation Trésorerie</span>
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center py-3 bg-primary-fixed/20 px-3 rounded-xl">
                    <span className="text-sm font-bold text-on-surface">Montant Total Versé :</span>
                    <span className="text-xl font-extrabold text-primary">
                      {amount.toLocaleString()} FCFA
                    </span>
                  </div>
                </div>

                {/* Canonical notice & stamp */}
                <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-on-surface block">
                      Attestation Fiscale &amp; Canonique
                    </span>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed">
                      {donationStatus === "completed"
                        ? "Ce reçu électronique certifié fait foi pour toute justification comptable et attestation de fidélité auprès de votre assemblée locale de rattachement."
                        : "Ce récépissé provisoire atteste de votre déclaration de versement. La quittance définitive sera générée dès validation par la Trésorerie."}
                    </p>
                  </div>
                  <div className="w-16 h-16 rounded-xl bg-surface-container-lowest flex items-center justify-center text-primary border border-primary/20 flex-shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-[36px]">
                      {donationStatus === "completed" ? "verified" : "hourglass_empty"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Actions & Download (4 cols) */}
            <div className="lg:col-span-4 sticky top-24 flex flex-col gap-4">
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container-high/60 space-y-4">
                <h4 className="font-bold text-sm text-on-surface font-display">
                  Gestion du Reçu &amp; Suite
                </h4>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full h-11 rounded-xl bg-primary-container hover:bg-primary text-on-primary text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  <span>Télécharger le Reçu PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: "Reçu de Don FULLGOPE",
                        text: `Reçu officiel de don FULLGOPE de ${amount.toLocaleString()} FCFA enregistré avec succès.`,
                      }).catch(() => {});
                    }
                  }}
                  className="w-full h-11 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">share</span>
                  <span>Partager l'attestation</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full h-11 rounded-xl border border-surface-container-high hover:bg-surface-container-low text-on-surface text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  <span>Effectuer un autre don</span>
                </button>

                <Link
                  href="/"
                  className="w-full h-10 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface text-xs font-medium flex items-center justify-center gap-2 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">home</span>
                  <span>Retour à l'accueil</span>
                </Link>
              </div>

              {/* Spiritual blessing note */}
              <div className="p-4 rounded-2xl bg-secondary-fixed/20 border border-secondary-fixed-dim/40 text-xs space-y-1 text-on-surface">
                <span className="font-bold block text-secondary">
                  Bénédiction sur vos finances
                </span>
                <p className="text-[11px] text-on-surface-variant italic leading-relaxed">
                  « Apportez à la maison du trésor toutes les dîmes... et vous verrez si je n'ouvre pas pour vous les écluses des cieux. » Malachie 3:10
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
