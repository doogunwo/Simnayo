<div align="center">

# Simnayo

**A Hyperledger Fabric prototype for verifiable plant provenance and ownership history**

![Hyperledger Fabric](https://img.shields.io/badge/Hyperledger-Fabric-2F3134?style=flat-square&logo=hyperledger&logoColor=white)
![Go](https://img.shields.io/badge/Chaincode-Go-00ADD8?style=flat-square&logo=go&logoColor=white)
![Node.js](https://img.shields.io/badge/Application-Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Web-Express-000000?style=flat-square&logo=express&logoColor=white)

</div>

## Overview

Simnayo is a decentralized plant-trading prototype that records plant information, cultivation updates, ownership changes, and ledger history on Hyperledger Fabric.

The project explores how a shared ledger can reduce information asymmetry between growers, sellers, and buyers. Instead of relying only on a seller's description, a plant can be represented as an on-chain asset with a persistent identifier and a queryable sequence of updates.

## Problem and approach

Plant transactions often separate the final product from its cultivation history. Buyers may have limited ways to verify where a plant came from, how it was grown, or whether ownership information is consistent.

Simnayo models each plant as a Fabric asset and records:

- a unique plant identifier;
- appraised value;
- sunlight, temperature, humidity, pH, and moisture information;
- horticulture notes; and
- the current owner.

Fabric's world state stores the latest asset representation, while transaction history provides the sequence of ledger updates associated with the plant ID.

## Architecture

```text
Web browser
    │
    ▼
Express application
    ├── admin and user enrollment
    ├── file-system identity wallet
    ├── plant registration and update requests
    ├── plant lookup and history views
    └── ownership-transfer requests
              │
              ▼
Hyperledger Fabric Gateway
    ├── Fabric CA identities
    ├── channel: mychannel
    └── smart contract transactions
              │
              ▼
Go chaincode
    ├── world-state plant assets
    └── immutable transaction history
```

## Smart contract

The Go chaincode defines a plant asset and exposes the following transactions:

| Transaction | Behavior |
| --- | --- |
| `CreateAsset` | Creates a plant asset when its `PlantID` does not already exist |
| `ReadAsset` | Reads the current plant state by `PlantID` |
| `UpdateAsset` | Replaces the stored cultivation and ownership fields |
| `AssetExists` | Checks whether a plant ID is present in world state |
| `TransferAsset` | Changes the owner and returns the previous owner |
| `GetAssetHistory` | Returns transaction IDs, timestamps, values, and deletion flags for a plant |

### Asset model

```text
PlantID
├── AppraisedValue
├── Sunlight
├── Temperature
├── Humidity
├── pH
├── Moisture
├── Horticulture notes
└── Owner
```

## Application layer

The Node.js application uses the Hyperledger Fabric SDK to connect the web interface to the ledger.

- Fabric CA enrollment creates administrator and application-user identities.
- A file-system wallet stores the generated X.509 identities.
- The Fabric Gateway connects an enrolled identity to `mychannel`.
- Evaluate transactions read plant state and history without updating the ledger.
- Submit transactions create plants, append cultivation updates, and transfer ownership.
- Express serves separate views for the landing page, administration, plant listing, shipping, and historical records.

## Data flow

```text
Register plant
    └── CreateAsset ──► current plant state

Record cultivation data
    └── UpdateAsset ──► updated state + ledger transaction

Inspect provenance
    └── GetAssetHistory ──► chronological state changes

Transfer plant
    └── TransferAsset ──► new owner + preserved transaction history
```

## Repository structure

```text
Simnayo/
├── app/
│   ├── server.js                   # Express and Fabric Gateway integration
│   ├── config/connection-org1.json # Fabric connection profile
│   ├── views/                      # Marketplace and record pages
│   └── wallet/                     # Development identities
├── contract/
│   └── chaincode-go/
│       ├── smartcontract.go        # Plant asset chaincode
│       └── chaincode/              # Chaincode tests and mocks
└── README.md
```

## Interface

![Simnayo interface](https://github.com/doogunwo/Simnayo/assets/87505243/cf3e3b01-3cf0-4095-a8e3-e622db8b0622)

![Simnayo plant view](https://github.com/doogunwo/Simnayo/assets/87505243/e5560952-15e3-4adc-995d-5a8bed61c49a)

## Project scope

Simnayo is a mini-project for exploring asset provenance, identity-backed transactions, and ownership transfer with Hyperledger Fabric. The repository contains the application and chaincode, but it expects a separately provisioned Fabric network and deployed chaincode.
