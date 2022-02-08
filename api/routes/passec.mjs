import express from "express"
const { Router, Request, Response } = express;
const route = Router();
import {sanitize} from "entitystorage";
import {validateAccess} from "../../../../services/auth.mjs"
import Bucket from "../../models/bucket.mjs";
import Entry from "../../models/entry.mjs";
import fetch from "node-fetch"
import CryptoJS from "../../www/libs/aes.js"

export default (app) => {

  const route = Router();
  app.use("/passec/buckets", route)

  route.get('/:id', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "passec.read"})) return;
    let bucket = Bucket.lookup(sanitize(req.params.id))
    if(!bucket) { res.sendStatus(404); return; }
    if(bucket.related.owner?.id != res.locals.user.id) return res.sendStatus(401);
    res.json(bucket.toObj());
  });

  route.post('/', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "passec.edit"})) return;
    let bucket = new Bucket(req.body.title, res.locals.user)
    res.json(bucket.toObj());
  });

  route.delete('/:id', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "passec.edit"})) return;
    let bucket = Bucket.lookup(sanitize(req.params.id))
    if(!bucket) { res.sendStatus(404); return; }
    if(bucket.related.owner?.id != res.locals.user.id) return res.sendStatus(401);
    bucket.delete();
    res.json(true);
  });

  route.patch('/:id', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "passec.edit"})) return;
    let bucket = Bucket.lookup(sanitize(req.params.id))
    if(!bucket) { res.sendStatus(404); return; }
    if(bucket.related.owner?.id != res.locals.user.id) return res.sendStatus(401);
    
    if(req.body.title !== undefined) bucket.title = req.body.title;

    res.json(bucket.toObj());
  });

  route.post('/:id/entries', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "passec.edit"})) return;
    let bucket = Bucket.lookup(sanitize(req.params.id))
    if(!bucket) { res.sendStatus(404); return; }
    if(bucket.related.owner?.id != res.locals.user.id) return res.sendStatus(401);
    let entry = bucket.addEntry(req.body.content)
    let lastKnownId = (req.body.lastKnownId && !isNaN(req.body.lastKnownId)) ? sanitize(""+req.body.lastKnownId) : null
    res.json((lastKnownId ? bucket.entriesSince(lastKnownId) : [entry]).map(e => e.toObj()));
  });

  route.get('/:id/entries/:entry', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "passec.edit"})) return;
    let bucket = Bucket.lookup(sanitize(req.params.id))
    if(!bucket) { res.sendStatus(404); return; }
    if(bucket.related.owner?.id != res.locals.user.id) return res.sendStatus(401);
    let entry = Entry.lookup(sanitize(req.params.entry))
    if(!entry) { res.sendStatus(404); return; }
    res.json(entry.toObjFull());
  });

  route.get('/:id/entries', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "passec.read"})) return;
    let bucket = Bucket.lookup(sanitize(req.params.id))
    if(!bucket) { res.sendStatus(404); return; }
    if(bucket.related.owner?.id != res.locals.user.id) return res.sendStatus(401);
    res.json(bucket.entries().map(e => e.toObj()));
  });

  route.get('/', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "passec.read"})) return;
    let buckets = Bucket.all(res.locals.user)
    res.json(buckets.map(b => b.toObj()));
  });

  route.post("/import", async (req, res) => {
    if(!validateAccess(req, res, {permission: "passec.edit"})) return;

    if(req.body.type == "legacy"){
      let bucketId = ""+req.body.bucketId
      let bucketName = ""+req.body.title || "Imported bucket"
      let bucketPassword = ""+req.body.key

      if(!bucketId) { res.sendStatus(404); return; }

      let rBucket;
      try{
        rBucket = await (await fetch(`https://passec.ahkpro.dk/api/getBucket?bucketId=${bucketId}`)).json()
      } catch(err){
        console.log(err)
      }

      if(!rBucket || !rBucket.success)
        return res.sendStatus(404);

      let bucket = new Bucket(bucketName, res.locals.user)

      for(let e of rBucket.result.passwords){
        let decrypted;
        try{
          decrypted = CryptoJS.AES.decrypt(e, bucketPassword);
          decrypted = decrypted.toString(CryptoJS.enc.Utf8);
        } catch(err){
          continue;
        }
        
        if(!decrypted || decrypted.substring(0, 1) != "{") continue;
        decrypted = JSON.parse(decrypted);
        let type = decrypted.type == -1 ? "del" : decrypted.type == 0 ? "edit" : "new";
        let obj = {id: decrypted.id, type, title: decrypted.title, username: decrypted.username, password: decrypted.password, tags: decrypted.tags?.split(",").map(t => t.trim())||[]}
        let encrypted = CryptoJS.AES.encrypt(JSON.stringify(obj), bucketPassword).toString();
        bucket.addEntry(encrypted)
      }
      res.json({success:true})
    } else if(req.body.type == "json"){
      try{
        let json = ""+req.body.json
        let buckets = JSON.parse(json)
        if(!Array.isArray(buckets)) throw "Must be an array"
        for(let b of buckets){
          if(!b.items || !Array.isArray(b.items)) continue;

          let bucket = new Bucket((b.title || "New bucket").substring(0, 500), res.locals.user)

          let items = b.items.filter(i => !isNaN(i.id) && i.content && typeof i.content === "string" && i.content.length < 1000)
                             .sort((a, b) => a.id - b.id)

          for(let i of items){
            bucket.addEntry(i.content)
          }
        }
        res.json({success:true})
      } catch(err){
        console.log(err)
        res.sendStatus(501)
      }
    }
  })
};