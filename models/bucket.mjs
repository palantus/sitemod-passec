import Entity from "entitystorage"
import Entry from "./entry.mjs";

export default class Bucket extends Entity {
  initNew(title, owner) {
    this.title = title || "New bucket";

    this.rel(owner, "owner")
    this.tag("passec-bucket")
  }

  static lookup(id) {
    if(!id) return null;
    return Bucket.find(`id:"${id}" tag:passec-bucket`)
  }

  static all(user){
    return Bucket.search(`tag:passec-bucket owner.id:${user}`)
  }

  entries(){
    return this.rels.entry?.map(p => Entry.from(p))||[]
  }

  entriesSince(id){
    return this.entries().filter(e => e.id > id)
  }

  addEntry(content){
    let entry = new Entry(content)
    this.rel(entry, "entry")
    return entry;
  }

  delete(){
    this.rels.entry?.forEach(i => i.delete())
    super.delete()
  }

  toObj() {
    return {
      id: this._id, 
      title: this.title,
      items: this.entries().map(i => i.toObj())
    }
  }
}