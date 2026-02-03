# 🚀 ZenTalk – Controlled Anonymity Chat App

ZenTalk is a **real-time anonymous chat application** built with one simple idea in mind:

> **People should be able to talk freely without giving away their identity — but without turning the platform unsafe.**

This project explores how privacy and safety can coexist using **Controlled Anonymity**.

> ❗ This is **not a dating app**. It’s about conversations, not matches.

---

## 🤔 The Problem We’re Solving

Most anonymous chat apps fall into one of two extremes:

* Completely anonymous → leads to spam, abuse, and catfishing
* Strict verification → email, phone, or identity checks that hurt privacy

**ZenTalk sits in the middle.**
Users stay anonymous, but the system quietly enforces fairness and safety in the background.

---

## 🧠 Core Idea: Controlled Anonymity

* No email. No phone number. No login.
* No images or chat history stored.
* Every user is anonymous — but not unaccountable.

We achieve this using **AI verification + device-based logic**, without collecting personal data.

---

## ✨ What ZenTalk Does

### 1️⃣ Anonymous Onboarding with AI Verification

* A unique **Device ID** is generated and stored locally
* Users verify gender using **live camera capture only** (gallery uploads disabled)
* An AI model classifies gender (Male / Female)
* 🧹 The image is **deleted immediately** after verification

---

### 2️⃣ Simple Pseudonymous Profiles

* Temporary nickname
* Short bio (1–2 lines)
* No profile pictures shown — text-only conversations

---

### 3️⃣ Smart Matching System

* Real-time matchmaking queue
* Filters: Male / Female / Any
* Cooldown logic to stop rapid re-queuing and spam

---

### 4️⃣ Ephemeral Chat Experience

* 1-to-1 real-time chat using WebSockets
* No chat history retained
* Users can Next, Leave, or Report a conversation

---

### 5️⃣ Fair Usage Limits

* Limited specific-gender matches per day (freemium-style logic)
* Limits reset daily using the Device ID

---

## 🏗️ Tech Stack (Quick View)

| Layer     | Tech                                 |
| --------- | ------------------------------------ |
| Frontend  | React / Next.js                      |
| Backend   | FastAPI / Django / Node.js           |
| Real-Time | WebSockets / Socket.IO               |
| AI        | Python (TensorFlow / PyTorch) or API |
| Data      | Redis + MongoDB / PostgreSQL         |

---

## 🔐 Privacy & Safety by Design

* No personal identifiers collected
* No image storage
* No chat retention
* Stateless AI verification
* Abuse prevention without compromising anonymity

---

## 📦 Project Deliverables

* Public GitHub repository
* Working demo (local or deployed)
* Architecture diagram
* Short video walkthrough
* Documentation on privacy & device ID logic

---

## ⚠️ Important Notes

* Not built for dating or matchmaking
* Zero image and chat storage
* Safety and fairness matter more than perfect AI accuracy

---

**Anonymous by design. Responsible by architecture.** 🔐💬
