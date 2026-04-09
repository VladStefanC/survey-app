# SurveyApp - Platformă Sondaje

Aplicație pentru crearea și distribuirea de sondaje online prin link-uri personalizate.

## Cerințe

- Node.js 18 sau versiune superioară
- npm

## Instalare

```bash
npm install
```

## Rulare

### Mod Development

```bash
npm run dev
```

Aplicația va fi disponibilă la: http://localhost:3000

### Mod Producție

```bash
npm run build
npm start
```

## Bază de Date

Aplicația folosește **SQLite** - o bază de date locală stocată în fișierul `surveyapp.db`.

Acest fișier se creează automat la prima rulare a aplicației. Nu necesită configurare sau instalare separată.

## Ghid de Utilizare

### 1. Cont
- Accesează http://localhost:3000/register pentru a crea un cont nou
- Sau login la http://localhost:3000/login

### 2. Creare Sondaj
1. Din meniul lateral, click pe **Lista sondajelor**
2. Click pe butonul **+ Sondaj nou**
3. Completează titlul și descrierea
4. Click **Creează sondaj**

### 3. Adăugare Întrebări
1. În pagina de editare a sondajului, click pe **+ Întrebare**
2. Alege tipul: **Multi-choice** (cu opțiuni) sau **Text liber**
3. Completează întrebarea și opțiunile (dacă e multi-choice)
4. Bifează **Required** dacă întrebarea este obligatorie
5. Click **Salvează**
6. Adaugă câte întrebări dorești

### 4. Publicare Sondaj
1. Click pe butonul **🚀 Publică** în pagina de editare
2. După publicare, sondajul nu mai poate fi modificat

### 5. Creare Lista Contacte
1. Din meniu, click pe **Liste contacte**
2. Click pe **+ Listă nouă** pentru a crea o listă
3. Click pe listă, apoi **+ Adaugă contact**
4. Completează email-ul și numele

### 6. Generare Link Sondaj
1. Din lista de contacte, click pe **Generează link** lângă un contact
2. Selectează sondajul pentru care vrei să generezi link
3. Click **Generează link**
4. Copiază link-ul și trimite-l contactului

### 7. Rezultate
1. Din **Lista sondajelor**, click pe **Rezultate** lângă sondajul publicat
2. Vezi statistici: invitați trimiși, deschise, răspunsuri primite
3. Vezi distribuția răspunsurilor per întrebare

## Structura Proiectului

```
/src
  /app          - Paginile aplicației (Next.js App Router)
  /lib          - Utilități (bază de date, autentificare)
```

## Tehnologii

- **Next.js 16** - Framework React
- **React 19** - Library pentru interfață
- **SQLite** - Bază de date
- **bcryptjs** - Criptare parole

