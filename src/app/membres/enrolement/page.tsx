"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { parsePhoneNumberFromString, isValidPhoneNumber } from "libphonenumber-js";
import { PortalShell } from "@/components/portal/PortalShell";
import { api } from "@/lib/api";
import { usePermissions } from "@/components/auth/Can";
import { AlertBanner } from "@/components/ui/AlertBanner";

interface AssemblyOption {
  id: string;
  name: string;
  city: string;
}

interface DepartmentOption {
  id: string;
  name: string;
}

interface FieldErrors {
  [key: string]: string;
}

export default function EnrolementMembrePage() {
  const { mounted: permMounted, can: checkCan } = usePermissions();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [assemblies, setAssemblies] = useState<AssemblyOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loadingAssemblies, setLoadingAssemblies] = useState(true);

  // Optional profile photo state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    // Step 1: Civil Identity & Assembly
    assemblyId: "",
    lastName: "",
    firstName: "",
    gender: "M" as "M" | "F",
    birthDate: "",
    birthPlace: "",
    nationality: "Camerounaise",
    profession: "",

    // Step 2: Contact
    phone: "",
    whatsapp: "",
    email: "",
    city: "Yaoundé",
    neighborhood: "",
    emergencyContact: "",

    // Step 3: Spiritual Journey
    spiritualStatus: "active",
    waterBaptism: true,
    baptismDate: "",
    baptismPlace: "",
    holySpiritBaptism: true,
    departmentId: "",
    spiritualGifts: "",

    // Step 4: Family & Pastoral
    maritalStatus: "single",
    spouseName: "",
    childrenCount: "0",
    certifyingPastor: "Rév. Dr. Ndifon Samuel (Pasteur Titulaire)",
    dataConsent: true,
  });

  // Track validation errors per field
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [stepValidationFailed, setStepValidationFailed] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdMember, setCreatedMember] = useState<any | null>(null);

  // Load real assemblies and departments on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [assRes, depRes] = await Promise.all([
          api.organizations.listAssemblies({ limit: 50 }),
          api.departments.list(),
        ]);

        const assList: any[] =
          (assRes.data as any)?.items ||
          (assRes.data as any)?.assemblies ||
          (Array.isArray(assRes.data) ? assRes.data : []);
        if (assList && assList.length > 0) {
          setAssemblies(
            assList.map((a: any) => ({
              id: a.id,
              name: a.name,
              city: a.city || "Cameroun",
            }))
          );
          // Set default assembly to Tsinga or first assembly
          const tsinga = assList.find((a: any) => a.name?.toLowerCase().includes("tsinga"));
          setFormData((prev) => ({
            ...prev,
            assemblyId: tsinga ? tsinga.id : assList[0].id,
          }));
        }

        const depList: any[] =
          (depRes.data as any)?.items ||
          (depRes.data as any)?.departments ||
          (Array.isArray(depRes.data) ? depRes.data : []);
        if (depList && depList.length > 0) {
          setDepartments(
            depList.map((d: any) => ({
              id: d.id,
              name: d.name,
            }))
          );
        }
      } catch (err) {
        console.warn("Erreur chargement données référentielles :", err);
      } finally {
        setLoadingAssemblies(false);
      }
    }

    loadData();
  }, []);

  // --- VALIDATION LOGIC ---

  const validatePhone = (value: string, required = false): string | null => {
    const trimmed = value.trim();
    if (!trimmed) {
      return required ? "Le numéro de téléphone principal est obligatoire." : null;
    }
    // Clean spaces, hyphens, parens
    const clean = trimmed.replace(/[\s\-\(\)]/g, "");
    // Try validating with default country 'CM' (Cameroon) or international
    const isValid = isValidPhoneNumber(clean, "CM") || isValidPhoneNumber(clean);
    if (!isValid) {
      return "Numéro invalide (ex: 677 00 00 00, 699100101 ou +237 6...)";
    }
    return null;
  };

  const formatPhoneNumber = (value: string): string => {
    try {
      const clean = value.trim().replace(/[\s\-\(\)]/g, "");
      const parsed = parsePhoneNumberFromString(clean, "CM") || parsePhoneNumberFromString(clean);
      return parsed ? parsed.formatInternational() : value;
    } catch {
      return value;
    }
  };

  const validateEmail = (value: string, required = false): string | null => {
    const trimmed = value.trim();
    if (!trimmed) {
      return required ? "L'adresse email est obligatoire." : null;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmed)) {
      return "Format email invalide (ex: fidele@fullgope.cm)";
    }
    return null;
  };

  const validateStep = (stepNumber: 1 | 2 | 3 | 4): boolean => {
    const newErrors: FieldErrors = {};

    if (stepNumber === 1) {
      if (!formData.assemblyId) {
        newErrors.assemblyId = "Veuillez sélectionner une assemblée d'accueil.";
      }
      if (!formData.lastName.trim() || formData.lastName.trim().length < 2) {
        newErrors.lastName = "Le nom de famille est obligatoire (minimum 2 caractères).";
      }
      if (!formData.firstName.trim() || formData.firstName.trim().length < 2) {
        newErrors.firstName = "Le prénom est obligatoire (minimum 2 caractères).";
      }
      if (formData.birthDate) {
        const bDate = new Date(formData.birthDate);
        const now = new Date();
        if (bDate > now) {
          newErrors.birthDate = "La date de naissance ne peut pas être dans le futur.";
        }
      }
      if (!formData.nationality.trim()) {
        newErrors.nationality = "La nationalité est obligatoire.";
      }
    }

    if (stepNumber === 2) {
      const phoneErr = validatePhone(formData.phone, true);
      if (phoneErr) newErrors.phone = phoneErr;

      if (formData.whatsapp.trim()) {
        const waErr = validatePhone(formData.whatsapp, false);
        if (waErr) newErrors.whatsapp = waErr;
      }

      if (formData.email.trim()) {
        const emailErr = validateEmail(formData.email, false);
        if (emailErr) newErrors.email = emailErr;
      }

      if (!formData.city.trim() || formData.city.trim().length < 2) {
        newErrors.city = "La ville de résidence est obligatoire.";
      }
      if (!formData.neighborhood.trim() || formData.neighborhood.trim().length < 2) {
        newErrors.neighborhood = "Le quartier ou repère précis est obligatoire.";
      }
    }

    if (stepNumber === 3) {
      if (!formData.spiritualStatus) {
        newErrors.spiritualStatus = "Le statut spirituel dans l'Église est obligatoire.";
      }
      if (formData.baptismDate) {
        const bDate = new Date(formData.baptismDate);
        const now = new Date();
        if (bDate > now) {
          newErrors.baptismDate = "La date de baptême ne peut pas être dans le futur.";
        }
        if (formData.birthDate && new Date(formData.birthDate) > bDate) {
          newErrors.baptismDate = "La date de baptême doit être postérieure à la naissance.";
        }
      }
    }

    if (stepNumber === 4) {
      if (formData.maritalStatus === "married") {
        if (!formData.spouseName.trim() || formData.spouseName.trim().length < 2) {
          newErrors.spouseName = "Le nom de l'époux(se) est requis pour un membre marié.";
        }
      }
      const count = parseInt(formData.childrenCount, 10);
      if (isNaN(count) || count < 0) {
        newErrors.childrenCount = "Le nombre d'enfants doit être un nombre valide (0 ou plus).";
      }
      if (!formData.dataConsent) {
        newErrors.dataConsent = "Le consentement légal et pastoral est obligatoire.";
      }
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    setStepValidationFailed(!isValid);
    return isValid;
  };

  const handleNextStep = () => {
    const isValid = validateStep(currentStep);
    if (isValid && currentStep < 4) {
      setStepValidationFailed(false);
      setCurrentStep((prev) => (prev + 1) as any);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleStepClick = (targetStep: 1 | 2 | 3 | 4) => {
    if (targetStep < currentStep) {
      // Always allow going back
      setStepValidationFailed(false);
      setCurrentStep(targetStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (targetStep === currentStep) {
      // Do nothing
    } else {
      // If jumping forward, validate current step first
      const isValid = validateStep(currentStep);
      if (isValid) {
        setStepValidationFailed(false);
        setCurrentStep(targetStep);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Instant validation on change for critical fields
    if (field === "phone") {
      const err = validatePhone(value, true);
      setErrors((prev) => ({ ...prev, phone: err || "" }));
    } else if (field === "whatsapp") {
      const err = value.trim() ? validatePhone(value, false) : null;
      setErrors((prev) => ({ ...prev, whatsapp: err || "" }));
    } else if (field === "email") {
      const err = value.trim() ? validateEmail(value, false) : null;
      setErrors((prev) => ({ ...prev, email: err || "" }));
    } else if (errors[field]) {
      // Clear error as user types
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoError("Le fichier sélectionné doit être une image (JPG, PNG ou WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("La photo ne doit pas dépasser 5 Mo.");
      return;
    }

    setPhotoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);

    // Also persist Base64 for cross-page persistence
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      if (typeof window !== "undefined") {
        localStorage.setItem("fullgope_last_member_photo", b64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoRemove = () => {
    setPhotoFile(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview(null);
    setPhotoError(null);
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all 4 steps
    const isStep1Valid = validateStep(1);
    const isStep2Valid = validateStep(2);
    const isStep3Valid = validateStep(3);
    const isStep4Valid = validateStep(4);

    if (!isStep1Valid) {
      setCurrentStep(1);
      return;
    }
    if (!isStep2Valid) {
      setCurrentStep(2);
      return;
    }
    if (!isStep3Valid) {
      setCurrentStep(3);
      return;
    }
    if (!isStep4Valid) {
      setCurrentStep(4);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    // Format phone to standard E.164
    let formattedPhone = formData.phone.trim();
    if (formattedPhone) {
      try {
        const clean = formattedPhone.replace(/[\s\-\(\)]/g, "");
        const parsed = parsePhoneNumberFromString(clean, "CM") || parsePhoneNumberFromString(clean);
        formattedPhone = parsed ? parsed.number : (clean.startsWith("+") ? clean : `+237${clean}`);
      } catch {
        // Fallback
      }
    }

    let formattedWhatsapp = formData.whatsapp.trim();
    if (formattedWhatsapp) {
      try {
        const cleanW = formattedWhatsapp.replace(/[\s\-\(\)]/g, "");
        const parsedW = parsePhoneNumberFromString(cleanW, "CM") || parsePhoneNumberFromString(cleanW);
        formattedWhatsapp = parsedW ? parsedW.number : (cleanW.startsWith("+") ? cleanW : `+237${cleanW}`);
      } catch {
        // Fallback
      }
    }

    const payload = {
      assembly_id: formData.assemblyId,
      first_name: formData.firstName.trim(),
      last_name: formData.lastName.trim(),
      email: formData.email.trim() ? formData.email.trim() : undefined,
      phone: formattedPhone || undefined,
      whatsapp: formattedWhatsapp || undefined,
      date_of_birth: formData.birthDate || undefined,
      gender: formData.gender,
      marital_status: formData.maritalStatus,
      profession: formData.profession.trim() || undefined,
      nationality: formData.nationality.trim() || "Camerounaise",
      baptism_date: formData.baptismDate || undefined,
      status: formData.spiritualStatus || "new",
      data_consent: Boolean(formData.dataConsent),
    };

    try {
      // 1. Upload optional photo to media server if selected
      let uploadedPhotoUrl: string | undefined = undefined;
      if (photoFile) {
        try {
          const mediaRes = await api.media.upload(photoFile, {
            category: "avatar",
            alt_text: `Photo ${formData.firstName} ${formData.lastName}`,
            assembly_id: formData.assemblyId,
          });
          if (!mediaRes.error && mediaRes.data) {
            uploadedPhotoUrl = mediaRes.data.url || mediaRes.data.file_path;
          }
        } catch (uploadErr) {
          console.warn("Échec téléversement distant photo, utilisation locale:", uploadErr);
        }
      }

      // 2. Register member with user in DB
      const res = await api.members.registerWithUser(payload);
      if (res.error) {
        setErrorMessage(res.message || "Erreur lors de l'enregistrement du membre en base de données.");
        setSubmitting(false);
        return;
      }

      const member = res.data?.member || res.data;
      if (member) {
        member.photo_url = uploadedPhotoUrl || photoPreview;
        if (typeof window !== "undefined" && member.id) {
          const b64 = localStorage.getItem("fullgope_last_member_photo");
          const photoToPersist = b64 || uploadedPhotoUrl || photoPreview;
          if (photoToPersist) {
            localStorage.setItem(`fullgope_member_photo_${member.id}`, photoToPersist);
            if (member.user_id) localStorage.setItem(`fullgope_member_photo_${member.user_id}`, photoToPersist);
          }
        }
      }
      setCreatedMember(member);

      // Optionally assign to department if selected
      if (formData.departmentId && member?.id) {
        try {
          await api.members.assignDepartment(member.id, {
            department_id: formData.departmentId,
            role: "Membre actif",
          });
        } catch (depErr) {
          console.warn("Affectation département ignorée :", depErr);
        }
      }

      setSubmitting(false);
    } catch (err: any) {
      setErrorMessage(err?.message || "Impossible de communiquer avec le serveur FULLGOPE.");
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setCreatedMember(null);
    setCurrentStep(1);
    setErrors({});
    setTouched({});
    setStepValidationFailed(false);
    setErrorMessage(null);
    handlePhotoRemove();
    setFormData((prev) => ({
      ...prev,
      lastName: "",
      firstName: "",
      gender: "M",
      birthDate: "",
      birthPlace: "",
      profession: "",
      phone: "",
      whatsapp: "",
      email: "",
      neighborhood: "",
      emergencyContact: "",
      baptismDate: "",
      baptismPlace: "",
      spiritualGifts: "",
      spouseName: "",
      childrenCount: "0",
    }));
  };

  if (permMounted && !checkCan({ permission: "can:create_member", minRole: 3 })) {
    return (
      <PortalShell>
        <div className="p-8 max-w-xl mx-auto my-16 text-center bg-surface-container-lowest rounded-3xl border border-rose-200 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-on-surface">Accès Réservé à l'Administration</h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            L'enrôlement officiel des membres au registre canonique requiert une habilitation administrative (Diaconat, Secrétariat ou Pastorat — Échelon N3 minimum).
          </p>
          <div className="pt-2">
            <Link href="/membres" className="inline-block px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-sm">
              Retour à l'annuaire des membres
            </Link>
          </div>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Breadcrumb & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <nav className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
            <Link href="/dashboard" className="hover:text-primary flex items-center gap-1">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>Accueil</span>
            </Link>
            <span>/</span>
            <Link href="/membres" className="hover:text-primary">
              Membres
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Enrôlement Canonique</span>
          </nav>

          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-full flex items-center gap-1.5 font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Base de Données Connectée (Port 8000)
            </span>
          </div>
        </div>

        {/* Page Header */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-surface-container-high/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-on-surface tracking-tight">
                  Enrôlement d'un Nouveau Membre
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold font-mono border border-primary/20">
                  Formulaire Validé
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                Fiche officielle d'enregistrement de fidèle • Mission du Plein Évangile Cameroun
              </p>
            </div>
            <Link
              href="/membres"
              className="text-xs font-bold text-on-surface-variant hover:text-on-surface flex items-center gap-1 bg-surface-container px-3 py-1.5 rounded-xl transition-colors self-start sm:self-auto"
            >
              <span>Annuler &amp; Retour</span>
            </Link>
          </div>
        </div>

        {/* Stepper Tabs Bar - HIGH CONTRAST & VISIBLE */}
        {!createdMember && (
          <div className="bg-surface-container-lowest p-3 rounded-2xl shadow-sm border border-surface-container-high/60">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {[
                { step: 1, label: "Identité Civile" },
                { step: 2, label: "Coordonnées" },
                { step: 3, label: "Parcours Spirituel" },
                { step: 4, label: "Famille & Validation" },
              ].map((s) => {
                const isPassed = currentStep > s.step;
                const isCurrent = currentStep === s.step;
                const isUpcoming = currentStep < s.step;

                return (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => handleStepClick(s.step as any)}
                    className={`p-3 rounded-xl flex items-center gap-3 text-left transition-all cursor-pointer relative overflow-hidden ${
                      isCurrent
                        ? "bg-[#c8102e] text-white shadow-md ring-2 ring-[#c8102e]/30 border-2 border-[#a60d26]"
                        : isPassed
                        ? "bg-emerald-50 text-emerald-950 border-2 border-emerald-600 shadow-sm hover:bg-emerald-100/90"
                        : "bg-slate-50 text-slate-700 border border-slate-200/90 hover:bg-slate-100"
                    }`}
                  >
                    {/* Circle Indicator */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 shadow-xs ${
                        isCurrent
                          ? "bg-white text-[#c8102e]"
                          : isPassed
                          ? "bg-emerald-700 text-white"
                          : "bg-slate-200 text-slate-700 font-bold"
                      }`}
                    >
                      {isPassed ? (
                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        s.step
                      )}
                    </div>

                    {/* Texts with Ultra Crisp Contrast */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-[10px] uppercase tracking-wider font-extrabold block ${
                            isCurrent
                              ? "text-white/90"
                              : isPassed
                              ? "text-emerald-900"
                              : "text-slate-500"
                          }`}
                        >
                          Étape {s.step}
                        </span>
                        {isPassed && (
                          <span className="text-[9px] font-black uppercase tracking-tight bg-emerald-700 text-white px-2 py-0.5 rounded-full shadow-xs">
                            ✓ Validée
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-xs font-black truncate block mt-0.5 ${
                          isCurrent
                            ? "text-white"
                            : isPassed
                            ? "text-emerald-950 font-black"
                            : "text-slate-800 font-bold"
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Validation Warning Alert */}
        {stepValidationFailed && (
          <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-800 flex items-center gap-3 animate-in fade-in duration-150">
            <svg className="w-5 h-5 text-rose-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <span className="font-extrabold text-xs block">Champs obligatoires ou invalides</span>
              <span className="text-xs">
                Veuillez renseigner correctement tous les champs marqués en rouge avant de passer à l'étape suivante.
              </span>
            </div>
          </div>
        )}

        {/* Server Error notification */}
        {errorMessage && (
          <AlertBanner
            type="error"
            title="Échec de l'enregistrement"
            message={errorMessage}
            onDismiss={() => setErrorMessage(null)}
          />
        )}

        {/* Step Forms */}
        {createdMember ? (
          <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-surface-container-high text-center space-y-5">
            <div className="relative w-24 h-24 mx-auto">
              {photoPreview || createdMember.photo_url || createdMember.user?.photo_url ? (
                <img
                  src={photoPreview || createdMember.photo_url || createdMember.user?.photo_url}
                  alt="Photo du membre"
                  className="w-24 h-24 rounded-2xl object-cover border-3 border-emerald-500 shadow-md mx-auto"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center text-3xl font-bold shadow-sm">
                  ✓
                </div>
              )}
              {(photoPreview || createdMember.photo_url) && (
                <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold shadow">
                  ✓
                </span>
              )}
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block">
                Enrôlement Confirmé en Base de Données
              </span>
              <h2 className="text-2xl font-extrabold text-on-surface">
                {createdMember.user?.first_name || formData.firstName} {createdMember.user?.last_name || formData.lastName}
              </h2>
            </div>

            <div className="max-w-md mx-auto p-4 rounded-xl bg-surface-container-low border border-surface-container-high/80 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-surface-container-high">
                <span className="text-on-surface-variant font-medium">Matricule National :</span>
                <span className="font-mono font-extrabold text-primary text-sm bg-primary-fixed px-2 py-0.5 rounded">
                  {createdMember.membership_number || "Généré"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-surface-container-high">
                <span className="text-on-surface-variant font-medium">Assemblée de rattachement :</span>
                <span className="font-bold text-on-surface">{createdMember.assembly_name || "Temple de rattachement"}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-surface-container-high">
                <span className="text-on-surface-variant font-medium">Statut canonique :</span>
                <span className="font-bold uppercase text-emerald-700">{createdMember.status || "Actif"}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-on-surface-variant font-medium">Identifiant Système (UUID) :</span>
                <span className="font-mono text-[11px] text-on-surface-variant truncate max-w-[200px]">{createdMember.id}</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link
                href={`/membres/${createdMember.id}`}
                className="px-5 py-2.5 rounded-xl bg-primary-container hover:bg-primary text-on-primary text-xs font-bold transition-all shadow-sm"
              >
                Consulter la Fiche Membre
              </Link>
              <button
                type="button"
                onClick={handleReset}
                className="px-5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-colors"
              >
                Enrôler un autre fidèle
              </button>
              <Link
                href="/membres"
                className="px-5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-colors"
              >
                Retour à l'Annuaire
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-surface-container-high/60 space-y-6">
              {/* ÉTAPE 1 : IDENTITÉ CIVILE & ASSEMBLÉE */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-surface-container pb-3">
                    <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                      <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      <span>1. Informations d'État Civil &amp; Assemblée Locale</span>
                    </h3>
                    <span className="text-xs text-on-surface-variant font-medium">* Champs obligatoires</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Assemblée */}
                    <div className="md:col-span-2">
                      <label className="font-bold text-on-surface block mb-1">
                        Assemblée d'accueil (Rattachement) *
                      </label>
                      <select
                        value={formData.assemblyId}
                        onChange={(e) => handleFieldChange("assemblyId", e.target.value)}
                        className={`w-full h-11 px-3 bg-surface-container-low rounded-xl text-on-surface border focus:outline-none focus:ring-2 font-bold ${
                          errors.assemblyId
                            ? "border-rose-500 bg-rose-50/50 focus:ring-rose-200"
                            : "border-surface-container-high focus:ring-primary"
                        }`}
                        required
                        disabled={loadingAssemblies}
                      >
                        {assemblies.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.city})
                          </option>
                        ))}
                      </select>
                      {errors.assemblyId && (
                        <p className="text-rose-600 font-semibold text-[11px] mt-1 flex items-center gap-1">
                          <span>⚠</span> {errors.assemblyId}
                        </p>
                      )}
                    </div>

                    {/* Photo de profil (Optionnel) */}
                    <div className="md:col-span-2 p-4 rounded-2xl bg-surface-container-low border border-surface-container-high/80">
                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                        {/* Avatar Preview Box */}
                        <div className="relative group shrink-0">
                          <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-primary/40 bg-surface-container-lowest flex items-center justify-center overflow-hidden shadow-xs">
                            {photoPreview ? (
                              <img
                                src={photoPreview}
                                alt="Aperçu photo"
                                className="w-full h-full object-cover rounded-2xl"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-slate-400">
                                <svg className="w-9 h-9 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                  <circle cx="12" cy="7" r="4" />
                                </svg>
                                <span className="text-[10px] font-semibold mt-1 text-slate-500">Photo</span>
                              </div>
                            )}
                          </div>
                          {photoPreview && (
                            <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                              ✓
                            </span>
                          )}
                        </div>

                        {/* Upload Controls & Instructions */}
                        <div className="flex-1 text-center sm:text-left space-y-2">
                          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                            <label className="font-bold text-on-surface text-sm">
                              Photo de profil du membre
                            </label>
                            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                              Optionnel
                            </span>
                          </div>

                          <p className="text-xs text-on-surface-variant leading-relaxed">
                            Ajoutez une photo d'identité claire (portrait de face). Elle figurera sur la carte de membre officielle et dans l'annuaire canonique de l'assemblée.
                          </p>

                          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                            <input
                              type="file"
                              ref={photoInputRef}
                              accept="image/png,image/jpeg,image/webp"
                              onChange={handlePhotoSelect}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => photoInputRef.current?.click()}
                              className="px-4 py-2 rounded-xl bg-primary-container hover:bg-primary text-on-primary text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                <circle cx="12" cy="13" r="4" />
                              </svg>
                              <span>{photoPreview ? "Changer la photo" : "Choisir une photo"}</span>
                            </button>

                            {photoPreview && (
                              <button
                                type="button"
                                onClick={handlePhotoRemove}
                                className="px-3 py-2 rounded-xl bg-surface-container hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                                <span>Supprimer</span>
                              </button>
                            )}
                            <span className="text-[11px] text-on-surface-variant font-medium">
                              JPG, PNG ou WebP (max. 5 Mo)
                            </span>
                          </div>

                          {photoError && (
                            <p className="text-rose-600 font-semibold text-xs mt-1 flex items-center gap-1">
                              <span>⚠</span> {photoError}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Nom de famille */}
                    <div>
                      <label className="font-bold text-on-surface block mb-1">Nom de famille *</label>
                      <input
                        type="text"
                        required
                        placeholder="ex: Mvondo"
                        value={formData.lastName}
                        onChange={(e) => handleFieldChange("lastName", e.target.value)}
                        className={`w-full h-11 px-3 bg-surface-container-low rounded-xl text-on-surface border focus:outline-none focus:ring-2 ${
                          errors.lastName
                            ? "border-rose-500 bg-rose-50/50 focus:ring-rose-200"
                            : formData.lastName.trim().length >= 2
                            ? "border-emerald-500/70"
                            : "border-surface-container-high focus:ring-primary"
                        }`}
                      />
                      {errors.lastName && (
                        <p className="text-rose-600 font-semibold text-[11px] mt-1 flex items-center gap-1">
                          <span>⚠</span> {errors.lastName}
                        </p>
                      )}
                    </div>

                    {/* Prénom */}
                    <div>
                      <label className="font-bold text-on-surface block mb-1">Prénom(s) *</label>
                      <input
                        type="text"
                        required
                        placeholder="ex: Jean-Claude"
                        value={formData.firstName}
                        onChange={(e) => handleFieldChange("firstName", e.target.value)}
                        className={`w-full h-11 px-3 bg-surface-container-low rounded-xl text-on-surface border focus:outline-none focus:ring-2 ${
                          errors.firstName
                            ? "border-rose-500 bg-rose-50/50 focus:ring-rose-200"
                            : formData.firstName.trim().length >= 2
                            ? "border-emerald-500/70"
                            : "border-surface-container-high focus:ring-primary"
                        }`}
                      />
                      {errors.firstName && (
                        <p className="text-rose-600 font-semibold text-[11px] mt-1 flex items-center gap-1">
                          <span>⚠</span> {errors.firstName}
                        </p>
                      )}
                    </div>

                    {/* Genre */}
                    <div>
                      <label className="font-bold text-on-surface block mb-1">Genre *</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => handleFieldChange("gender", e.target.value as any)}
                        className="w-full h-11 px-3 bg-surface-container-low rounded-xl text-on-surface border border-surface-container-high focus:outline-none font-semibold"
                      >
                        <option value="M">Masculin (Frère / Homme)</option>
                        <option value="F">Féminin (Sœur / Femme)</option>
                      </select>
                    </div>

                    {/* Date de naissance */}
                    <div>
                      <label className="font-bold text-on-surface block mb-1">Date de naissance</label>
                      <input
                        type="date"
                        value={formData.birthDate}
                        onChange={(e) => handleFieldChange("birthDate", e.target.value)}
                        className={`w-full h-11 px-3 bg-surface-container-low rounded-xl text-on-surface border focus:outline-none font-mono ${
                          errors.birthDate
                            ? "border-rose-500 bg-rose-50/50"
                            : "border-surface-container-high"
                        }`}
                      />
                      {errors.birthDate && (
                        <p className="text-rose-600 font-semibold text-[11px] mt-1 flex items-center gap-1">
                          <span>⚠</span> {errors.birthDate}
                        </p>
                      )}
                    </div>

                    {/* Lieu de naissance */}
                    <div>
                      <label className="font-bold text-on-surface block mb-1">Lieu de naissance</label>
                      <input
                        type="text"
                        placeholder="ex: Yaoundé"
                        value={formData.birthPlace}
                        onChange={(e) => handleFieldChange("birthPlace", e.target.value)}
                        className="w-full h-11 px-3 bg-surface-container-low rounded-xl text-on-surface border border-surface-container-high focus:outline-none"
                      />
                    </div>

                    {/* Nationalité */}
                    <div>
                      <label className="font-bold text-on-surface block mb-1">Nationalité *</label>
                      <input
                        type="text"
                        required
                        value={formData.nationality}
                        onChange={(e) => handleFieldChange("nationality", e.target.value)}
                        className={`w-full h-11 px-3 bg-surface-container-low rounded-xl text-on-surface border focus:outline-none font-medium ${
                          errors.nationality
                            ? "border-rose-500 bg-rose-50/50"
                            : "border-surface-container-high"
                        }`}
                      />
                      {errors.nationality && (
                        <p className="text-rose-600 font-semibold text-[11px] mt-1 flex items-center gap-1">
                          <span>⚠</span> {errors.nationality}
                        </p>
                      )}
                    </div>

                    {/* Profession */}
                    <div className="md:col-span-2">
                      <label className="font-bold text-on-surface block mb-1">Profession / Activité</label>
                      <input
                        type="text"
                        placeholder="ex: Enseignant, Cadre d'entreprise, Commerçant..."
                        value={formData.profession}
                        onChange={(e) => handleFieldChange("profession", e.target.value)}
                        className="w-full h-11 px-3 bg-surface-container-low rounded-xl text-on-surface border border-surface-container-high focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ÉTAPE 2 : COORDONNÉES */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-surface-container pb-3">
                    <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                      <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      <span>2. Coordonnées &amp; Résidence au Cameroun</span>
                    </h3>
                    <span className="text-xs text-on-surface-variant font-medium">* Validateur libphonenumber actif</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Téléphone Principal */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-on-surface">Téléphone principal (+237) *</label>
                        {formData.phone && !errors.phone && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <span>✓</span> {formatPhoneNumber(formData.phone)}
                          </span>
                        )}
                      </div>
                      <input
                        type="tel"
                        required
                        placeholder="ex: 677 00 00 00 ou +237 699..."
                        value={formData.phone}
                        onChange={(e) => handleFieldChange("phone", e.target.value)}
                        className={`w-full h-11 px-3 bg-surface-container-low rounded-xl text-on-surface border focus:outline-none font-mono font-bold ${
                          errors.phone
                            ? "border-rose-500 bg-rose-50/50 focus:ring-2 focus:ring-rose-200"
                            : formData.phone && !errors.phone
                            ? "border-emerald-500/80 bg-emerald-50/20"
                            : "border-surface-container-high focus:ring-2 focus:ring-primary"
                        }`}
                      />
                      {errors.phone ? (
                        <p className="text-rose-600 font-semibold text-[11px] mt-1 flex items-center gap-1">
                          <span>⚠</span> {errors.phone}
                        </p>
                      ) : (
                        <p className="text-on-surface-variant text-[11px] mt-1">
                          Format local Cameroun (ex: 699100101) ou international (+237 6...).
                        </p>
                      )}
                    </div>

                    {/* WhatsApp */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-on-surface">Numéro WhatsApp (Optionnel)</label>
                        {formData.whatsapp && !errors.whatsapp && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <span>✓</span> {formatPhoneNumber(formData.whatsapp)}
                          </span>
                        )}
                      </div>
                      <input
                        type="tel"
                        placeholder="ex: +237 690 00 00 00"
                        value={formData.whatsapp}
                        onChange={(e) => handleFieldChange("whatsapp", e.target.value)}
                        className={`w-full h-11 px-3 bg-surface-container-low rounded-xl text-on-surface border focus:outline-none font-mono ${
                          errors.whatsapp
                            ? "border-rose-500 bg-rose-50/50"
                            : formData.whatsapp && !errors.whatsapp
                            ? "border-emerald-500/80"
                            : "border-surface-container-high focus:ring-2 focus:ring-primary"
                        }`}
                      />
                      {errors.whatsapp && (
                        <p className="text-rose-600 font-semibold text-[11px] mt-1 flex items-center gap-1">
                          <span>⚠</span> {errors.whatsapp}
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="font-bold text-on-surface block mb-1">
                        Adresse E-mail (Accès portail membre)
                      </label>
                      <input
                        type="email"
                        placeholder="nom.prenom@email.com"
                        value={formData.email}
                        onChange={(e) => handleFieldChange("email", e.target.value)}
                        className={`w-full h-11 px-3 bg-surface-container-low rounded-xl text-on-surface border focus:outline-none ${
                          errors.email
                            ? "border-rose-500 bg-rose-50/50 focus:ring-2 focus:ring-rose-200"
                            : formData.email && !errors.email
                            ? "border-emerald-500/80"
                            : "border-surface-container-high focus:ring-2 focus:ring-primary"
                        }`}
                      />
                      {errors.email ? (
                        <p className="text-rose-600 font-semibold text-[11px] mt-1 flex items-center gap-1">
                          <span>⚠</span> {errors.email}
                        </p>
                      ) : (
                        <p className="text-on-surface-variant text-[11px] mt-1">
                          Nécessaire si le membre souhaite se connecter à l'espace fidèles.
                        </p>
                      )}
                    </div>

                    {/* Ville */}
                    <div>
                      <label className="font-bold text-on-surface block mb-1">Ville de résidence *</label>
                      <input
                        type="text"
                        required
                        value={formData.city}
                        onChange={(e) => handleFieldChange("city", e.target.value)}
                        className={`w-full h-11 px-3 bg-surface-container-low rounded-xl text-on-surface border focus:outline-none ${
                          errors.city
                            ? "border-rose-500 bg-rose-50/50"
                            : "border-surface-container-high focus:ring-2 focus:ring-primary"
                        }`}
                      />
                      {errors.city && (
                        <p className="text-rose-600 font-semibold text-[11px] mt-1 flex items-center gap-1">
                          <span>⚠</span> {errors.city}
                        </p>
                      )}
                    </div>

                    {/* Quartier */}
                    <div>
                      <label className="font-bold text-on-surface block mb-1">Quartier &amp; Repères précis *</label>
                      <input
                        type="text"
                        required
                        placeholder="ex: Bastos, Carrefour Ambassade..."
                        value={formData.neighborhood}
                        onChange={(e) => handleFieldChange("neighborhood", e.target.value)}
                        className={`w-full h-11 px-3 bg-surface-container-low rounded-xl text-on-surface border focus:outline-none ${
                          errors.neighborhood
                            ? "border-rose-500 bg-rose-50/50"
                            : "border-surface-container-high focus:ring-2 focus:ring-primary"
                        }`}
                      />
                      {errors.neighborhood && (
                        <p className="text-rose-600 font-semibold text-[11px] mt-1 flex items-center gap-1">
                          <span>⚠</span> {errors.neighborhood}
                        </p>
                      )}
                    </div>

                    {/* Contact urgence */}
                    <div>
                      <label className="font-bold text-on-surface block mb-1">Contact en cas d'urgence</label>
                      <input
                        type="text"
                        placeholder="Nom + Téléphone du proche"
                        value={formData.emergencyContact}
                        onChange={(e) => handleFieldChange("emergencyContact", e.target.value)}
                        className="w-full h-11 px-3 bg-surface-container-low rounded-xl text-on-surface border border-surface-container-high focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ÉTAPE 3 : PARCOURS SPIRITUEL */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-surface-container pb-3">
                    <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                      <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                      </svg>
                      <span>3. Parcours Spirituel &amp; Engagement Canonique</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="font-bold text-on-surface block mb-1">Statut dans l'Église *</label>
                      <select
                        value={formData.spiritualStatus}
                        onChange={(e) => handleFieldChange("spiritualStatus", e.target.value)}
                        className="w-full h-11 px-3 bg-surface-container-low rounded-xl text-on-surface border border-surface-container-high focus:outline-none font-semibold"
                      >
                        <option value="active">Membre Actif (Baptisé d'eau et d'Esprit)</option>
                        <option value="new">Nouveau Converti (En observation)</option>
                        <option value="catechumen">Catéchumène (En préparation de baptême)</option>
                        <option value="regular">Adhérent / Fréquentant régulier</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-on-surface block mb-1">Département ou Ministère souhaité</label>
                      <select
                        value={formData.departmentId}
                        onChange={(e) => handleFieldChange("departmentId", e.target.value)}
                        className="w-full h-11 px-3 bg-surface-container-low rounded-xl text-on-surface border border-surface-container-high focus:outline-none font-semibold"
                      >
                        <option value="">-- Aucun pour le moment --</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-on-surface block mb-1">Date du Baptême par Immersion</label>
                      <input
                        type="date"
                        value={formData.baptismDate}
                        onChange={(e) => handleFieldChange("baptismDate", e.target.value)}
                        className={`w-full h-11 px-3 bg-surface-container-low rounded-xl text-on-surface border focus:outline-none font-mono ${
                          errors.baptismDate ? "border-rose-500 bg-rose-50/50" : "border-surface-container-high"
                        }`}
                      />
                      {errors.baptismDate && (
                        <p className="text-rose-600 font-semibold text-[11px] mt-1 flex items-center gap-1">
                          <span>⚠</span> {errors.baptismDate}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="font-bold text-on-surface block mb-1">Lieu &amp; Pasteur officiant le baptême</label>
                      <input
                        type="text"
                        placeholder="ex: Temple Central Tsinga - Rév. Samuel"
                        value={formData.baptismPlace}
                        onChange={(e) => handleFieldChange("baptismPlace", e.target.value)}
                        className="w-full h-11 px-3 bg-surface-container-low rounded-xl text-on-surface border border-surface-container-high focus:outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="font-bold text-on-surface block mb-1">Dons spirituels et ministères exercés</label>
                      <input
                        type="text"
                        placeholder="ex: Intercession, Chorale, Accueil, Enseignement..."
                        value={formData.spiritualGifts}
                        onChange={(e) => handleFieldChange("spiritualGifts", e.target.value)}
                        className="w-full h-11 px-3 bg-surface-container-low rounded-xl text-on-surface border border-surface-container-high focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ÉTAPE 4 : FAMILLE & VALIDATION */}
              {currentStep === 4 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-surface-container pb-3">
                    <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                      <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      <span>4. Situation Familiale &amp; Visa Pastoral</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="font-bold text-on-surface block mb-1">État matrimonial *</label>
                      <select
                        value={formData.maritalStatus}
                        onChange={(e) => handleFieldChange("maritalStatus", e.target.value)}
                        className="w-full h-11 px-3 bg-surface-container-low rounded-xl text-on-surface border border-surface-container-high focus:outline-none font-semibold"
                      >
                        <option value="single">Célibataire</option>
                        <option value="married">Marié(e) chrétiennement</option>
                        <option value="widowed">Veuf / Veuve</option>
                        <option value="divorced">Divorcé(e)</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-on-surface block mb-1">
                        Nom du conjoint(e) {formData.maritalStatus === "married" ? "*" : "(le cas échéant)"}
                      </label>
                      <input
                        type="text"
                        placeholder="Nom complet du conjoint"
                        value={formData.spouseName}
                        onChange={(e) => handleFieldChange("spouseName", e.target.value)}
                        className={`w-full h-11 px-3 bg-surface-container-low rounded-xl text-on-surface border focus:outline-none ${
                          errors.spouseName
                            ? "border-rose-500 bg-rose-50/50 focus:ring-2 focus:ring-rose-200"
                            : "border-surface-container-high"
                        }`}
                      />
                      {errors.spouseName && (
                        <p className="text-rose-600 font-semibold text-[11px] mt-1 flex items-center gap-1">
                          <span>⚠</span> {errors.spouseName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="font-bold text-on-surface block mb-1">Nombre d'enfants à charge</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.childrenCount}
                        onChange={(e) => handleFieldChange("childrenCount", e.target.value)}
                        className={`w-full h-11 px-3 bg-surface-container-low rounded-xl text-on-surface border focus:outline-none ${
                          errors.childrenCount ? "border-rose-500 bg-rose-50/50" : "border-surface-container-high"
                        }`}
                      />
                      {errors.childrenCount && (
                        <p className="text-rose-600 font-semibold text-[11px] mt-1 flex items-center gap-1">
                          <span>⚠</span> {errors.childrenCount}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="font-bold text-on-surface block mb-1">Pasteur Titulaire de l'Assemblée</label>
                      <input
                        type="text"
                        value={formData.certifyingPastor}
                        className="w-full h-11 px-3 bg-surface-container rounded-xl text-primary border border-surface-container-high font-bold cursor-not-allowed"
                        readOnly
                      />
                    </div>

                    <div className="md:col-span-2 pt-2">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.dataConsent}
                          onChange={(e) => handleFieldChange("dataConsent", e.target.checked)}
                          className="mt-0.5 rounded border-surface-container-high text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                        />
                        <span className="text-on-surface-variant leading-relaxed font-medium">
                          Le membre consent à l'enregistrement de ses informations personnelles dans le registre centralisé de la Mission du Plein Évangile Cameroun conformément à la charte pastorale et aux normes de protection des données.
                        </span>
                      </label>
                      {errors.dataConsent && (
                        <p className="text-rose-600 font-semibold text-[11px] mt-1 flex items-center gap-1">
                          <span>⚠</span> {errors.dataConsent}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high text-xs space-y-2">
                    <span className="font-bold text-on-surface block">Synthèse du dossier à transmettre :</span>
                    <p className="text-on-surface-variant leading-relaxed">
                      Le fidèle <strong className="text-on-surface">{formData.firstName || "..."} {formData.lastName || "..."}</strong> sera enregistré dans la base de données ecclésiale sous le statut <strong className="text-emerald-700 uppercase font-bold">{formData.spiritualStatus}</strong>.
                      Un compte utilisateur et un matricule national unique lui seront attribués automatiquement.
                    </p>
                  </div>
                </div>
              )}

              {/* Bottom Stepper Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-surface-container-high">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setStepValidationFailed(false);
                      setCurrentStep((prev) => (prev - 1) as any);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="h-10 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>← Étape précédente</span>
                  </button>
                ) : (
                  <div />
                )}

                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="h-10 px-5 rounded-xl bg-primary-container hover:bg-primary text-on-primary text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                  >
                    <span>Étape suivante →</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-md active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Enregistrement en base de données...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                          <polyline points="17 21 17 13 7 13 7 21" />
                          <polyline points="7 3 7 8 15 8" />
                        </svg>
                        <span>Valider l'Enrôlement en Base de Données</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        )}
      </div>
    </PortalShell>
  );
}
