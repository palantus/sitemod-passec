import Entity, {nextNum, query} from "entitystorage"

export default class Entry extends Entity {
  initNew(content) {
    this.id = nextNum("passec")
    this.content = content;
    this.tag("passec-entry")
  }

  static lookup(id) {
    if(!id) return null;
    return query.type(Entry).id(id).tag("passec-entry").first
  }

  toObj() {
    return {
      id: this.id,
      content: this.content
    }
  }
}