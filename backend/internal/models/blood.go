package models

// BloodCompatibility maps each donor blood type to the recipient types it can donate to.
var BloodCompatibility = map[BloodType][]BloodType{
	BloodTypeONeg:  {BloodTypeONeg, BloodTypeOPos, BloodTypeANeg, BloodTypeAPos, BloodTypeBNeg, BloodTypeBPos, BloodTypeABNeg, BloodTypeABPos},
	BloodTypeOPos:  {BloodTypeOPos, BloodTypeAPos, BloodTypeBPos, BloodTypeABPos},
	BloodTypeANeg:  {BloodTypeANeg, BloodTypeAPos, BloodTypeABNeg, BloodTypeABPos},
	BloodTypeAPos:  {BloodTypeAPos, BloodTypeABPos},
	BloodTypeBNeg:  {BloodTypeBNeg, BloodTypeBPos, BloodTypeABNeg, BloodTypeABPos},
	BloodTypeBPos:  {BloodTypeBPos, BloodTypeABPos},
	BloodTypeABNeg: {BloodTypeABNeg, BloodTypeABPos},
	BloodTypeABPos: {BloodTypeABPos},
}

// GetCompatibleDonorTypes returns all blood types that can donate to the given recipient type.
func GetCompatibleDonorTypes(recipient BloodType) []BloodType {
	var compatible []BloodType
	for donor, recipients := range BloodCompatibility {
		for _, r := range recipients {
			if r == recipient {
				compatible = append(compatible, donor)
				break
			}
		}
	}
	return compatible
}
