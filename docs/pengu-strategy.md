---
id: pengu-strategy
title: Overview
sidebar_label: Overview
---

# Overview

PENGU Strategy is a decentralized token protocol on the Abstract blockchain that creates a perpetual on-chain economy through automated buybacks, deflation, and rewards — all centered around $PST and $PENGU.

## Core Mechanisms

- **Automated Buyback Cycle:** All trading of $PST incites a constant buyback and burn loop, building value for holders with every transaction.
- **Deflationary Supply:** Each buyback leads to PST being burned, permanently reducing supply.

## Transaction Fee Structure

A 10% fee is charged on every $PST transaction:
- **8%** goes to the protocol treasury (used for PENGU buybacks, resale, and weekly rewards)
- **1.5%** is allocated for operations and development
- **0.5%** supports the $INVEST ecosystem

## Treasury Operations

All treasury funds are managed automatically by smart contracts:
- 70% of the treasury is used for buying PENGU and reselling with markup
- 30% is reserved for weekly rewards distribution to PST holders

## Anti-Whale Protection

To ensure fair play and decentralization:
- Maximum transaction: **1% of supply**
- Maximum wallet: **2% of supply**
Team and protocol contracts may be exempt for technical purposes.

## PENGU Buyback & Sale Cycle

1. Fees accumulate in the treasury
2. When threshold is reached, buys PENGU on the market
3. Purchased PENGU is listed for sale at a **1.1x markup** in the PENGU/ETH pair. Sale only triggers if CEX price matches/exceeds DEX price to prevent manipulation.
4. Proceeds from resales are used to buy back and burn PST tokens, reducing supply and driving value.

## Holder Rewards

- Every week (epoch = 7 days), 30% of PENGU bought is distributed to PST holders as dividends
- Daily snapshots are taken; holding longer means a higher reward multiplier (catching all 7 snapshots = 7x multiplier versus just final snapshot)
- Dividends can be claimed via the website

## Transparency & Automation

All actions — fees, buybacks, resales, burns, and rewards — are on-chain and verifiable. Smart contracts handle all operations transparently, with no manual intervention, and all contract addresses are public.
