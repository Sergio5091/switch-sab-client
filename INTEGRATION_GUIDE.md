# Guide de connexion des pages Admin au backend

## ✅ Déjà connectées :
- `categories.tsx` ✅
- `durees.tsx` ✅  
- `licence.tsx` ✅

## 📝 À connecter :

### 1. **postes.tsx**

**Imports à ajouter :**
```tsx
import adminService, { Poste } from "@/services/adminService";
```

**State à remplacer :**
```tsx
// AVANT : const { postes, addPoste, updatePoste, deletePoste } = useApp();
// APRÈS :
const [postes, setPostes] = useState<Poste[]>([]);

useEffect(() => {
  adminService.getPostes().then(setPostes);
}, []);
```

**Fonctions CRUD :**
```tsx
async function onSubmit(values) {
  if (editing) {
    const updated = await adminService.updatePoste(editing.id, { nom: values.nom, categorieId: Number(values.categorieId) });
    setPostes(prev => prev.map(p => p.id === editing.id ? updated : p));
  } else {
    const created = await adminService.createPoste({ nom: `Poste ${values.numero}`, categorieId: Number(values.categorieId) });
    setPostes(prev => [...prev, created]);
  }
  setOpen(false);
}

async function handleDelete(id) {
  await adminService.deletePoste(id);
  setPostes(prev => prev.filter(p => p.id !== id));
  setDeleteId(null);
}
```

**⚠️ Attention :** Le backend n'a PAS de champ `numero`, `typeSwitch`, `actif` — juste `nom`, `categorieId`, `image`, `statut`.

---

### 2. **gerants.tsx**

**Imports :**
```tsx
import adminService, { Gerant } from "@/services/adminService";
```

**State :**
```tsx
const [gerants, setGerants] = useState<Gerant[]>([]);

useEffect(() => {
  adminService.getGerants().then(setGerants);
}, []);
```

**CRUD :**
```tsx
async function onSubmit(values) {
  if (editing) {
    const updated = await adminService.updateGerant(editing.id, {
      nom: values.nom,
      prenom: values.prenom,
      telephone: values.phone,
      email: values.email,
      active: values.actif
    });
    setGerants(prev => prev.map(g => g.id === editing.id ? updated : g));
  } else {
    const created = await adminService.createGerant({
      pseudo: values.email.split("@")[0],
      telephone: values.phone,
      email: values.email,
      nom: values.nom,
      prenom: values.prenom,
      motDePasse: "admin123"
    });
    setGerants(prev => [...prev, created]);
  }
  setOpen(false);
}
```

**⚠️ Mapping :** `phone` → `telephone`, `actif` → `active`

---

### 3. **bonus.tsx**

**Imports :**
```tsx
import adminService, { ConfigBonus } from "@/services/adminService";
```

**State :**
```tsx
const [config, setConfig] = useState<ConfigBonus | null>(null);

useEffect(() => {
  adminService.getConfigBonus()
    .then(setConfig)
    .catch(() => setConfig(null)); // Pas encore créée
}, []);
```

**CRUD :**
```tsx
async function onSubmit(values) {
  const updated = await adminService.updateConfigBonus({
    ratioSecondes: values.ratioJeu * 60,
    seuilDeblocage: values.seuilMinutes * 60,
    validitejours: values.validiteMois * 30
  });
  setConfig(updated);
  toast({ title: "Configuration bonus sauvegardée" });
}
```

**⚠️ Mapping :** Le backend utilise `ratioSecondes`/`seuilDeblocage` en **secondes**, pas minutes.

---

### 4. **promo.tsx**

**Imports :**
```tsx
import adminService from "@/services/adminService";
```

**State :**
```tsx
const [config, setConfig] = useState({ bonusParrain: 10, reductionInvite: 5 });

useEffect(() => {
  adminService.getPromoConfig()
    .then(setConfig)
    .catch(() => {});
}, []);
```

**CRUD :**
```tsx
async function onSubmit(values) {
  const updated = await adminService.updatePromoConfig({
    bonusParrain: values.bonusParrainPct,
    reductionInvite: values.reductionInvitePct
  });
  setConfig(updated);
  toast({ title: "Configuration parrainage sauvegardée" });
}
```

---

### 5. **coupons.tsx**

**Imports :**
```tsx
import adminService, { Coupon } from "@/services/adminService";
```

**State :**
```tsx
const [coupons, setCoupons] = useState<Coupon[]>([]);

useEffect(() => {
  adminService.getCoupons().then(setCoupons);
}, []);
```

**Génération :**
```tsx
async function handleGenerate() {
  const res = await adminService.genererCoupons({ nombre: Number(count), valeur: Number(valeur) });
  toast({ title: `${count} coupons générés` });
  // Recharger
  adminService.getCoupons().then(setCoupons);
}
```

**⚠️ Format :** Le backend retourne `{ message, coupons: [...] }`, pas directement les coupons.

---

### 6. **promotions.tsx**

**Imports :**
```tsx
import adminService, { Promotion } from "@/services/adminService";
```

**State :**
```tsx
const [promotions, setPromotions] = useState<Promotion[]>([]);

useEffect(() => {
  adminService.getPromotions().then(setPromotions);
}, []);
```

**CRUD :**
```tsx
async function onSubmit(values) {
  const created = await adminService.createPromotion({ titre: values.texte });
  setPromotions(prev => [created, ...prev]);
  toast({ title: "Promotion créée" });
  setOpen(false);
}

async function handleSend(id) {
  await adminService.envoyerPromotion(id);
  setPromotions(prev => prev.map(p => p.id === id ? { ...p, envoyee: true } : p));
  toast({ title: "Promotion envoyée" });
}
```

**⚠️ Mapping :** `texte` → `titre` dans le backend.

---

## Résumé des changements globaux :

1. **Supprimer** `useApp()` sauf pour `currentUser`
2. **Ajouter** `useState` + `useEffect` pour charger les données
3. **Remplacer** toutes les mutations par des appels `adminService`
4. **Gérer** les erreurs avec `try/catch` + toast
5. **Rafraîchir** l'état local après chaque mutation réussie

## Mappings importants :

| Frontend | Backend |
|---|---|
| `phone` | `telephone` |
| `actif` / `actif` | `active` |
| `dureeMinutes` | `secondes` |
| `texte` (promo) | `titre` |
| `couleur` | ❌ N'existe pas en base |
