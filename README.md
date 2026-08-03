#  GRAMSAKHI

> Smart Rural Healthcare & Emergency Support Platform

GRAMSAKHI is a rural healthcare and community support platform designed to help ASHA workers manage patient health records, identify medical emergencies early, and improve healthcare coordination in villages and underserved areas.

---

## 🎯 Problem Statement

In many rural communities:

* Patient records are maintained manually
* Emergency symptoms are identified too late
* Communication with hospitals is slow
* Internet connectivity is unreliable
* ASHA workers manage large populations with limited tools

These challenges often result in delayed emergency response and inconsistent healthcare monitoring.

---

## 💡 Solution

GRAMSAKHI provides a lightweight digital healthcare platform optimized for rural environments.

The platform helps healthcare workers:

* Digitally manage patient records
* Track symptoms and health conditions
* Detect emergency-risk patients
* Generate alerts during critical situations
* Coordinate with hospitals efficiently
* Continue working even without internet connectivity

---

## 🩺 Core Features

### 👩‍⚕️ Patient Management

* Add and manage patient records
* Store medical history
* Track symptoms and visits

### 🧠 AI-Assisted Emergency Detection

Rule-based emergency analysis system.

#### Example:

| Symptoms                          | Risk Level       |
| --------------------------------- | ---------------- |
| Chest pain + breathing difficulty | 🔴 High Risk     |
| Fever + cough                     | 🟡 Moderate Risk |
| Mild symptoms                     | 🟢 Low Risk      |

The system provides:

* Emergency alerts
* First-aid guidance
* Precaution suggestions
* Hospital referral recommendations

### 📡 Offline-First Support

* Offline data storage
* Auto-sync when internet reconnects
* Local caching support

### 🏥 Hospital Coordination

* Emergency patient alerts
* QR-based patient access
* Faster communication with hospitals

---

## 👥 Target Users

### Primary Users

* ASHA Workers
* Rural Healthcare Volunteers
* Community Health Officers

### Secondary Users

* Clinics
* Primary Health Centers
* Rural Hospitals
* Healthcare Administrators

---

## 🛠 Tech Stack

| Layer            | Technology    |
| ---------------- | ------------- |
| Frontend         | React.js      |
| Backend Services | Firebase      |
| Database         | Firestore     |
| Authentication   | Firebase Auth |
| Hosting          | Vercel        |

---

## 🚀 Installation

### Clone Repository

```bash
git clone https://github.com/ACHU-ACHUTHA/GRAMSAKHI.git
```

### Open Project

```bash
cd GRAMSAKHI
```

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
npm run dev
```

---

## 🔥 Firebase Setup

1. Create a Firebase project
2. Enable Firestore Database
3. Enable Firebase Authentication
4. Add Firebase configuration inside:

```bash
src/firebase.js
```

---

## 🌍 Vision

The long-term vision of GRAMSAKHI is to become a smart rural healthcare ecosystem that combines:

* Patient management
* Emergency intelligence
* Offline accessibility
* Community healthcare coordination
* AI-assisted healthcare support

into one unified platform for underserved communities.

---

## 📈 Future Enhancements

* Multilingual support
* Voice assistance
* AI/ML-based health prediction
* Government scheme integration
* Telemedicine support
* Emergency SMS alerts
* Maternal & child healthcare tracking

---

## 🤝 Contribution

Contributions, suggestions, and improvements are welcome.

---

## 📄 License

This project is developed for educational, innovation, and social impact purposes.
