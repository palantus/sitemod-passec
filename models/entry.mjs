import Entity, {nextNum} from "entitystorage"

export default class Entry extends Entity {
  initNew(content) {
    this.id = nextNum("passec")
    this.content = content;
    this.tag("passec-entry")
  }

  static lookup(id) {
    if(!id) return null;
    return Entry.find(`id:"${id}" tag:passec-entry`)
  }

  toObj() {
    return {
      id: this.id,
      content: this.content
    }
  }
}