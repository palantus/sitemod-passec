import Role from "../../models/role.mjs"
import DataType from "../../models/datatype.mjs"

export default async () => {
  // init
  Role.lookupOrCreate("passec").addPermission(["passec.read", "passec.edit"], true)

  DataType.lookupOrCreate("passec-bucket", {title: "Passec bucket", permission: "passec.read", api: "passec/buckets", nameField: "title", uiPath: "passec/buckets"})
  
  return {}
}