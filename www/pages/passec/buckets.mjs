const elementName = 'passec-buckets-page'

import {default as api, userPermissions} from "/system/api.mjs"
import "/components/action-bar.mjs"
import "/components/action-bar-item.mjs"
import "/components/field-ref.mjs"
import "/components/field.mjs"
import "/components/field-edit.mjs"
import {on, off, fire} from "/system/events.mjs"
import {state, pushStateQuery, apiURL} from "/system/core.mjs"
import {showDialog} from "/components/dialog.mjs"
import { promptDialog, confirmDialog } from "../../components/dialog.mjs"
import "/components/data/searchhelp.mjs"
import CryptoJS from "/libs/aes.js"
import {uuidv4} from "/libs/uuid.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <link rel='stylesheet' href='/css/searchresults.css'>
  <style>
    #container{
        position: relative;
    }
    .hidden{display: none;}

    #flex{
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      margin: 10px;
    }
    #flex > div{
      border: 1px solid #aaa;
      border-radius: 7px;
      box-shadow: 3px 3px 10px gray;
      padding: 10px;
    }
    .bucket{
      cursor:pointer;
      border-radius: 5px;
      padding: 5px;
      margin: 3px;
      border-left: solid 1px transparent;
      border-right: solid 1px transparent;
      user-select: none;
    }
    .bucket:hover{background-color: #ccc; box-shadow: 0px 0px 5px #aaa;}
    .bucket.selected{
      border-left: solid 1px gray;
      border-right: solid 1px gray;
    }
    #passwords-tab{margin-top: 5px;}
    #passwords-tab td{
      padding-right: 10px;
    }
    #key-container{ border-bottom: 1px solid #ccc; padding-bottom: 8px;}
    .password button{padding: 3px;}

    .right-action-buttons{
      position: absolute;
      left: calc(100% + .25rem);
      top: 0;
      opacity: 0;
      pointer-events: none;
      transform: translateX(5px);
      transition: opacity 150ms ease-in-out, transform 150ms ease-in-out;
    }
    .right-action-buttons:hover{
      opacity: 1
      pointer-events: auto;
    }
    .itemtextcontainer{position: relative;}
    .itemtext{width: 100%; display: inline-block;}
    .itemtextcontainer:focus-within .right-action-buttons{opacity: 1; pointer-events: auto;}
    .itemtextcontainer:hover .right-action-buttons{opacity: 1; pointer-events: auto;}
    .right-action-buttons .delete-btn{cursor: pointer; pointer-events: auto; background-image: url("/img/delete.png"); display: inline-block; width: 15px; height: 15px;background-size: cover;}
  </style>  

  <action-bar>
      <action-bar-item id="new-btn" class="hidden">New bucket</action-bar-item>
      <action-bar-item id="refresh-btn">Refresh</action-bar-item>
      <action-bar-item id="add-password-btn" class="hidden">Add password</action-bar-item>
  </action-bar>

  <div id="container">
    
    <div id="flex">
      <div id="bucket-container">
        <h2>Buckets</h2>
        <div id="buckets"></div>
      </div>
      <div id="passwords-container" class="hidden">
        <h2>Passwords in <span id="bucket-title"></span></h2>
        <div id="key-container">
          <label for="key">Key: </label>
          <input id="key" type="password" placeholder="Enter key to decrypt">
          <input id="cache-key" title="This will store the encryption key in your browser, so you don't have to enter it every time" type="checkbox">
          <label for="cache-key">Cache key</label>
        </div>
        <input id="search" type="text" placeholder="Enter query" value=""></input>

        <table id="passwords-tab">
          <thead>
            <tr>
              <th>Title</th>
              <th>Username</th>
              <th>Tags</th>
              <th></th>
          </thead>
          <tbody id="passwords">
          </tbody>
        </table>
      </div>
    </div>
  </div>
  
  <dialog-component title="New password" id="new-password-dialog">
    <field-component label="Title"><input id="add-title"></input></field-component>
    <field-component label="Username"><input id="add-username"></input></field-component>
    <field-component label="Password"><input id="add-password"></input></field-component>
    <field-component label="Tags"><input id="add-tags"></input></field-component>
  </dialog-component>

  <dialog-component title="New bucket" id="new-bucket-dialog">
    <field-component label="Title"><input id="new-bucket-title"></input></field-component>
  </dialog-component>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.refreshData = this.refreshData.bind(this);
    this.newBucket = this.newBucket.bind(this);
    this.newPassword = this.newPassword.bind(this);
    this.queryChanged = this.queryChanged.bind(this);
    this.bucketTabClick = this.bucketTabClick.bind(this)
    this.pwTabClick = this.pwTabClick.bind(this)
    this.keyChanged = this.keyChanged.bind(this)
    
    this.shadowRoot.getElementById("new-btn").addEventListener("click", this.newBucket)
    this.shadowRoot.getElementById("add-password-btn").addEventListener("click", this.newPassword)
    this.shadowRoot.getElementById("refresh-btn").addEventListener("click", this.refreshData)
    this.shadowRoot.getElementById('buckets').addEventListener("click", this.bucketTabClick)
    this.shadowRoot.getElementById('passwords').addEventListener("click", this.pwTabClick)
    this.shadowRoot.getElementById('key').addEventListener("change", this.keyChanged)
    this.shadowRoot.getElementById('cache-key').addEventListener("change", this.keyChanged)

    this.searchDelayTimer = null;
    this.shadowRoot.getElementById('search').addEventListener("input", () => {
      clearTimeout(this.searchDelayTimer)
      this.searchDelayTimer = setTimeout(() => {
        this.queryChanged()
        pushStateQuery(this.lastQuery ? {filter: this.lastQuery} : undefined)
      }, 200)
    })

    this.query = ""

    userPermissions().then(permissions => {
      if(permissions.includes("passec.edit")){
        this.shadowRoot.getElementById("new-btn").classList.remove("hidden")
      }
    })

    this.refreshData()
  }

  async refreshData(){
    let buckets = await api.get("passec/buckets")
    this.shadowRoot.getElementById("buckets").innerHTML = buckets.map(b => `
      <div class="bucket" data-bucketid="${b.id}">
        <div class="itemtextcontainer">
          <span class="itemtext title" tabindex=0>${b.title}</span>
          <span class="right-action-buttons"><span class="delete-btn" title="Delete"></span></span>
        </div>
      </div>
    `).join("")
  }

  async queryChanged(q = this.shadowRoot.getElementById('search').value){
    if(q == this.lastQuery)
      return;

    q = q.toLowerCase()

    this.lastQuery = q;
    this.shadowRoot.getElementById('search').value = q;

    if(this.entries !== undefined)
      this.refreshPasswordsView();
  }


  newBucket(){
    let dialog = this.shadowRoot.getElementById("new-bucket-dialog")
    
    showDialog(dialog, {
      show: () => this.shadowRoot.getElementById("new-bucket-title").focus(),
      ok: async (val) => {
        await api.post(`passec/buckets`, val)
        this.refreshData()
      },
      validate: (val) => 
          !val.title ? "Please fill out title"
        : true,
      values: () => {return {
        title: this.shadowRoot.getElementById("new-bucket-title").value
      }},
      close: () => {
        this.shadowRoot.querySelectorAll("field-component input").forEach(e => e.value = '')
      }
    })
  }

  newPassword(){
    let dialog = this.shadowRoot.getElementById("new-password-dialog")
    
    showDialog(dialog, {
      show: () => this.shadowRoot.getElementById("add-title").focus(),
      ok: async (val) => {
        this.addEntry(val)
      },
      validate: (val) => 
          !val.title ? "Please fill out title"
        : !val.password ? "Please fill out password"
        : true,
      values: () => {return {
        title: this.shadowRoot.getElementById("add-title").value,
        username: this.shadowRoot.getElementById("add-username").value,
        password: this.shadowRoot.getElementById("add-password").value,
        tags: this.shadowRoot.getElementById("add-tags").value.split(",").map(t => t.trim()),
        type: "new"
      }},
      close: () => {
        this.shadowRoot.querySelectorAll("field-component input").forEach(e => e.value = '')
      }
    })
  }

  async bucketTabClick(e){
    let div = e.target.closest("div.bucket");
    let id = div.getAttribute("data-bucketid")
    let title = div.querySelector(".title").innerText

    if(e.target.classList.contains("delete-btn")){
      if(!(await confirmDialog(`Are you sure that you want to delete the bucket titled "${title}"?`))) return;
      await api.del(`passec/buckets/${id}`)
      this.shadowRoot.getElementById("passwords-container").classList.add("hidden")
      this.refreshData()
    } else {
      this.curBucketId = id;
      this.shadowRoot.querySelectorAll(`div.bucket:not([data-bucketid="${id}"])`).forEach(e => e.classList.remove("selected"))
      div.classList.add("selected")
      this.shadowRoot.getElementById("passwords-container").classList.remove("hidden")
      this.shadowRoot.getElementById("add-password-btn").classList.add("hidden")
      this.shadowRoot.getElementById("bucket-title").innerText = title
      let storedKey = localStorage.getItem(`passec-bucket-${id}-key`)
      this.shadowRoot.getElementById("cache-key").checked = storedKey ? true : false
      this.shadowRoot.getElementById("key").value = storedKey || ""
      this.shadowRoot.getElementById("passwords").innerHTML = ""
      this.loadBucket(id)
    }
  }

  async loadBucket(id){
    this.entries = [];
    this.entries = await api.get(`passec/buckets/${id}/entries`)
    if(this.shadowRoot.getElementById("key").value)
      this.keyChanged()
  }

  async keyChanged(){
    if(!this.curBucketId) return;
    this.key = this.shadowRoot.getElementById("key").value
    if(!this.key) {
      this.shadowRoot.getElementById("passwords").innerHTML = ""
      return;
    }
    if(!this.entries){
      return;
    }
    if(this.shadowRoot.getElementById("cache-key").checked){
      localStorage.setItem(`passec-bucket-${this.curBucketId}-key`, this.key)
    } else {
      localStorage.setItem(`passec-bucket-${this.curBucketId}-key`, "")
    }

    this.refreshPasswordsView()
  }

  decryptPasswords(){
    if(!this.key) return;
    for(let entry of this.entries){
      if(entry.decrypted !== undefined) continue;
      try{
        let decrypted = CryptoJS.AES.decrypt(entry.content, this.key);
        decrypted = decrypted.toString(CryptoJS.enc.Utf8);
        if(decrypted.substring(0, 1) == "{"){
          entry.decrypted = JSON.parse(decrypted);
        }
      } catch(err){}
    }
  }

  async addEntry({id, type, title, username, password, tags}){
    let obj = type == "new" ? {type, title, username, password, tags, id: uuidv4()}
            : type == "edit" ? {type, id, title, username, password, tags}
            : type == "del" ? {type, id}
            : null;
    if(!obj) return;
    var encrypted = CryptoJS.AES.encrypt(JSON.stringify(obj), this.key).toString();
    let response = await api.post(`passec/buckets/${this.curBucketId}/entries`, {content: encrypted, lastKnownId: this.entries.slice(-1)?.[0]?.id||null})
    this.entries.push(...response)
    this.refreshPasswordsView();
  }

  refreshPasswordsView(){
    this.decryptPasswords()
    this.passwords = []
    for(let e of this.entries){
      if(!e.decrypted) continue;
      let entry = e.decrypted;
      switch(entry.type){
        case "new":
          this.passwords.push(entry)
          break;
        case "edit":
          let p = this.passwords.find(p => p.id == entry.id)
          if(!p) continue;
          if(entry.title) p.title = entry.title;
          if(entry.username) p.username = entry.username;
          if(entry.password) p.password = entry.password;
          if(entry.tags) p.tags = entry.tags;
          break;
        case "del":
          this.passwords = this.passwords.filter(p => p.id != entry.id)
          break;
      }
    }

    this.shadowRoot.getElementById("passwords").innerHTML = this.passwords.filter(p => (p.title+p.password+p.username+p.tags.join("")).toLowerCase().includes(this.lastQuery))
                                                                          .map(p => `
      <tr class="result password" data-id="${p.id}">
        <td>${p.title}</td>
        <td>${p.username}</td>
        <td>${p.tags.join(", ")}</td>
        <td><button class="copy-pw">Copy</button><button class="edit-pw">Edit</button><button class="del-pw">Delete</button></td>
      </tr>
    `).join("")

    this.shadowRoot.getElementById("add-password-btn").classList.remove("hidden")
  }
  async pwTabClick(e){
    let div = e.target.closest("tr.result");
    let id = div.getAttribute("data-id")
    let p = this.passwords.find(p => p.id == id)
    if(e.target.classList.contains("copy-pw")){
      navigator.clipboard.writeText(p.password)
    } if(e.target.classList.contains("edit-pw")){
      let newPw = await promptDialog("Enter new password", p.password)
      if(newPw){
        this.addEntry({id, type: "edit", password: newPw})
      }
    } else if(e.target.classList.contains("del-pw")){
      if(!(await confirmDialog(`Are you sure that you want to delete the password titled "${p.title}"?`))) return;
      this.addEntry({type: "del", id})
    }
  }

  connectedCallback() {
    this.shadowRoot.getElementById('search').focus();
    this.queryChanged(state().query.filter||"");
    on("changed-page", elementName, this.refreshData)
    on("changed-page-query", elementName, (query) => this.queryChanged(query.filter || ""))
  }

  disconnectedCallback() {
    off("changed-page", elementName)
    off("changed-page-query", elementName)
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}