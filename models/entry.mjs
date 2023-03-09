import Entity, {nextNum, query} from "entitystorage"
import { getTimestamp } from "../../../tools/date.mjs";

export default class Entry extends Entity {
  initNew(content) {
    this.id = nextNum("passec")
    this.content = content;
    this.timestamp = getTimestamp();
    this.tag("passec-entry")
  }

  static lookup(id) {
    if(!id) return null;
    return query.type(Entry).id(id).tag("passec-entry").first
  }

  toObj() {
    return {
      id: this.id,
      timestamp: this.timestamp || null,
      content: this.content
    }
  }
}