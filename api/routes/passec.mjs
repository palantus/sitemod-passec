import express from "express"
const { Router, Request, Response } = express;
const route = Router();
import {sanitize} from "entitystorage";
import {validateAccess} from "../../../../services/auth.mjs"
import Bucket from "../../models/bucket.mjs";
import Entry from "../../models/entry.mjs";

export default (app) => {

  const route = Router();
  app.use("/passec/buckets", route)

  route.get('/:id', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "passec.read"})) return;
    let bucket = Bucket.lookup(sanitize(req.params.id))
    if(!bucket) { res.sendStatus(404); return; }
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
    bucket.delete();
    res.json(true);
  });

  route.patch('/:id', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "passec.edit"})) return;
    let bucket = Bucket.lookup(sanitize(req.params.id))
    if(!bucket) { res.sendStatus(404); return; }
    
    if(req.body.title !== undefined) bucket.title = req.body.title;

    res.json(bucket.toObj());
  });

  route.post('/:id/entries', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "passec.edit"})) return;
    let bucket = Bucket.lookup(sanitize(req.params.id))
    if(!bucket) { res.sendStatus(404); return; }
    let entry = bucket.addEntry(req.body.content)
    let lastKnownId = (req.body.lastKnownId && !isNaN(req.body.lastKnownId)) ? sanitize(""+req.body.lastKnownId) : null
    res.json((lastKnownId ? bucket.entriesSince(lastKnownId) : [entry]).map(e => e.toObj()));
  });

  route.get('/:id/entries/:entry', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "passec.edit"})) return;
    let bucket = Bucket.lookup(sanitize(req.params.id))
    if(!bucket) { res.sendStatus(404); return; }
    let entry = Entry.lookup(sanitize(req.params.entry))
    if(!entry) { res.sendStatus(404); return; }
    res.json(entry.toObjFull());
  });

  route.get('/:id/entries', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "passec.read"})) return;
    let bucket = Bucket.lookup(sanitize(req.params.id))
    if(!bucket) { res.sendStatus(404); return; }
    res.json(bucket.entries().map(e => e.toObj()));
  });

  route.get('/', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "passec.read"})) return;
    let buckets = Bucket.all(res.locals.user)
    res.json(buckets.map(b => b.toObj()));
  });
};