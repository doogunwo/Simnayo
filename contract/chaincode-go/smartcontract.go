package chaincode

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	"github.com/golang/protobuf/ptypes"
)

// SmartContract provides functions for managing an Asset
type SmartContract struct {
	contractapi.Contract
}

// Asset describes basic details of what makes up a simple asset
// Insert struct field in alphabetic order => to achieve determinism across languages
// golang keeps the order when marshal to json but doesn't order automatically

type Asset struct {
	AppraisedValue 	int    `json:"AppraisedValue"`
	PlantID			string `json:"PlantID"`
	Sunlight		string `json:"Sunlight"`
	Temp          	string `json:"Temp"`
	Humidity        string `json:"Humidity"`
	Ph           	string `json:"Ph"`
	Moisture		string `json:"Moisture"`
	Owner          	string `json:"Owner"`
	Horticulture	string `json:"Horticulture"`
}

type HistoryQueryResult struct {
	Record    		*Asset    	`json:"record"`
	TxId     		string    	`json:"txId"`
	Timestamp 		time.Time 	`json:"timestamp"`
	IsDelete  		bool      	`json:"isDelete"`
}

/*

PlantID
Sunlight
Temp
Humidity
Moisture
Ph
Horticulture
Owner
*/

// InitLedger adds a base set of assets to the ledger

// CreateAsset issues a new asset to the world state with given details.
func (s *SmartContract) CreateAsset(ctx contractapi.TransactionContextInterface, AppraisedValue int, PlantID string, Sunlight string, Temp string, Humidity string, Ph string,Moisture string,Owner string, Horticulture string) error {

	exists, err := s.AssetExists(ctx, PlantID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("the asset %s already exists", PlantID)
	}

	asset:= Asset{
		AppraisedValue	: AppraisedValue,
		PlantID			: PlantID,
		Sunlight		: Sunlight,
		Temp          	: Temp,
		Humidity        : Humidity,
		Ph           	: Ph,
		Moisture		: Moisture,
		Owner          	: Owner,
		Horticulture	: Horticulture,
	}

	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(PlantID, assetJSON)
}

// ReadAsset returns the asset stored in the world state with given id.
func (s *SmartContract) ReadAsset(ctx contractapi.TransactionContextInterface, PlantID string) (*Asset, error) {
	assetJSON, err := ctx.GetStub().GetState(PlantID)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if assetJSON == nil {
		return nil, fmt.Errorf("the asset %s does not exist", PlantID)
	}

	var asset Asset
	err = json.Unmarshal(assetJSON, &asset)
	if err != nil {
		return nil, err
	}

	return &asset, nil
}

// UpdateAsset updates an existing asset in the world state with provided parameters.
func (s *SmartContract) UpdateAsset(ctx contractapi.TransactionContextInterface, PlantID string, Sunlight string, Temp string, Humidity string, Ph string,Moisture string,Owner string, Horticulture string) error {
	exists, err := s.AssetExists(ctx, PlantID)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("the asset %s does not exist", PlantID)
	}

	// overwriting original asset with new asset
	asset:= Asset{
		PlantID			: PlantID,
		Sunlight		: Sunlight,
		Temp          	: Temp,
		Humidity        : Humidity,
		Ph           	: Ph,
		Moisture		: Moisture,
		Owner          	: Owner,
		Horticulture	: Horticulture,
	}

	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(PlantID, assetJSON)
}


// AssetExists returns true when asset with given ID exists in world state
func (s *SmartContract) AssetExists(ctx contractapi.TransactionContextInterface, PlantID string) (bool, error) {
	assetJSON, err := ctx.GetStub().GetState(PlantID)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}

	return assetJSON != nil, nil
}

// TransferAsset updates the owner field of asset with given id in world state, and returns the old owner.
func (s *SmartContract) TransferAsset(ctx contractapi.TransactionContextInterface, id string, newOwner string) (string, error) {
	asset, err := s.ReadAsset(ctx, id)
	if err != nil {
		return "", err
	}

	oldOwner := asset.Owner
	asset.Owner = newOwner

	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return "", err
	}

	err = ctx.GetStub().PutState(id, assetJSON)
	if err != nil {
		return "", err
	}

	return oldOwner, nil
}

func (t *SmartContract) GetAssetHistory(ctx contractapi.TransactionContextInterface, PlantID string) ([]HistoryQueryResult,error){
	log.Printf("GetAssetHistory: PlantID %v",PlantID)

	resultsIterator, err := ctx.GetStub().GetHistoryForKey(PlantID)
	if err != nil {
		 return nil,err
	}

	defer resultsIterator.Close()

	var records []HistoryQueryResult
	for resultsIterator.HasNext(){
		response,err := resultsIterator.Next()
		if err != nil {
			return nil,err
		}

		var asset Asset
		if len(response.Value) > 0 {
			err = json.Unmarshal(response.Value, &asset)
			if err != nil {
				return nil,err
			}
		} else {
			asset = Asset {
				PlantID: PlantID,
			}
		}
		timestamp, err := ptypes.Timestamp(response.Timestamp)
		if err != nil {
			return nil, err
		}

		record := HistoryQueryResult {
			TxId		: response.TxId,
			Timestamp	: timestamp,
			Record		: &asset,
			IsDelete	: response.IsDelete,
		}
		records = append(records,record)
	}
	return records, nil
}

func main() {
	assetChaincode, err := contractapi.NewChaincode(&SmartContract{})
	
	if err != nil {
		log.Panicf("Error creating asset-transfer-basic chaincode: %v", err)
	}

	if err := assetChaincode.Start(); err != nil {
		log.Panicf("Error starting asset-transfer-basic chaincode: %v", err)
	}
}
