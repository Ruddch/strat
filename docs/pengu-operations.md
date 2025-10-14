---
id: pengu-operations
title: PENGU Operations
sidebar_label: PENGU Operations
---

# PENGU Operations

## PENGU Buyback and Resale Mechanism

PENGU Strategy uses automated smart contracts to continually buy PENGU tokens using treasury funds derived from PST fees, then resell those PENGU tokens with a markup, and send all profits to PST buyback and burn.

---

### 1. Threshold-Based Lot Formation

- PST trading fees accumulate in the treasury's trading pool.
- When the balance exceeds **1 ETH**, the contract automatically uses a fixed "use amount" to buy PENGU from the Abstract DEX.
- Purchased PENGU forms a *lot* (a tracked batch meant for resale).

---

### 2. Markup and Sale Logic

- Each PENGU lot is listed for sale at a **1.1x markup**, but only in the **PENGU/ETH pair**.
- A lot can't be sold until the DEX price for the lot is at least `purchase price × 1.1` — ensuring protocol profit, not loss.

---

### 3. CEX Price Verification

- Before approving any sale, the contract checks the current CEX (centralized exchange) price in USD.
- The real DEX sale only proceeds if the PENGU/ETH DEX price does NOT deviate by more than 10% from the CEX USD price (after conversion).
- This prevents manipulation of DEX price for quick artificially-triggered sales and ensures genuine market demand.

---

### 4. Proceeds and Buyback

- **100% of the ETH received from PENGU sales is automatically used for PST buyback.**
- All bought-back PST is burned (irreversibly destroyed).
- This creates continuous upward pressure on PST price and minimizes supply.

---

### 5. Summary Flow

- Fees collected from PST trades
- Treasury accumulates to 1 ETH threshold  
- PENGU bought and formed into new lot
- Lot listed for resale at 1.1x purchase price, only if DEX ≈ CEX price
- On sale, 100% proceeds used to buy and burn PST

---

## Price Manipulation Protection

- Markup-only sales: no resales at a loss or break-even
- Twin price reference (DEX + CEX): no isolated DEX pump/dump triggers
- All operations enforced on-chain and by verified oracles

---