# Passec

Passec is a password manager.

## What is Passec?
Passec is a password manager which is designed to be very easy to use across all platforms and, of course, very secure.

## How do I use it?
Open a bucket, which is simply a set of passwords. 

"Is that secure?" - you might ask. The answer is yes, because every entry in a bucket is encrypted with a password (or sentence) of your choosing. If someone else opens your bucket, they can only see the passwords that they can decrypt using whatever password they enter, keeping your passwords accessible to only you.

## How secure is it?
Very. The passwords are encrypted locally on your computer using an AES 256-bit encryption. The only time your passwords aren't encrypted, is when you open your list of passwords and enter the password to decrypt. The only information that are sent to our server is your bucket ID and a long encrypted string for every entry into the bucket. So your passwords are secure even if our servers are compromised or your computer gets stolen!

## How does it work?
A bucket is a list of entries. An entry can be either an added password, a trashed password or a modified password. It is not possible to delete or modify these entries and only those decryptable with your password will be used to generate your list of passwords. So noone else can delete or edit your passwords without your decryption password.

Every entry is entirely encrypted and without the password, it is not even possible to know which type of entry it is. Whenever you synchronize with the server, every entry the server doesn't have gets stored in our database. These entries will then be synchronized to other clients accessing that bucket. When you enter a password for a bucket, the client will attempt to decrypt every entry. Only those successful will be used to generate your list of passwords.

## Can I backup my passwords?
Yes. It is possible to import/export passwords from the user interface.
