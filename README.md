# BoxCards API

### Overview

[BoxCards](https://boxcards.app) is a full-stack flashcard app. This API is made with Express.js and MongoDB. Also, I used AWS Parameter Store for managing secrets and AWS ECS for deploying the API to cloud.

In BoxCards, flashcards are represented as objects rather than raw text, meaning that you can reuse and share flashcards with ease! If you have a particular card in 2 different sets, changing that card in one set will affect that card in other set because its the same object. So, a set is basically a group of pointers to flashcard objects.


### Developing
```
npm run serverstart
```

### Building an Image
```
docker build --platform=linux/amd64 -t boxcards-api-linux .
```

---

#### <ins>[BoxCards UI Repo](https://github.com/jakethellama/boxcards-ui)</ins>
