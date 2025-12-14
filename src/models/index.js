// Archivo central de modelos - Define relaciones entre modelos
const { sequelize } = require('../config/database')
const User = require('./User')
const Friendship = require('./Friendship')
const Shelf = require('./Shelf')
const ShelfItem = require('./ShelfItem')
const Post = require('./Post')
const Comment = require('./Comment')
const Like = require('./Like')
const ChatMessage = require('./ChatMessage')

// ========================================
// Relaciones de Usuario y Amistad
// ========================================

// Un usuario puede enviar muchas solicitudes de amistad
User.hasMany(Friendship, {
  foreignKey: 'requesterId',
  as: 'sentRequests'
})

// Un usuario puede recibir muchas solicitudes de amistad
User.hasMany(Friendship, {
  foreignKey: 'addresseeId',
  as: 'receivedRequests'
})

// Cada solicitud de amistad pertenece a un solicitante
Friendship.belongsTo(User, {
  foreignKey: 'requesterId',
  as: 'requester'
})

// Cada solicitud de amistad pertenece a un destinatario
Friendship.belongsTo(User, {
  foreignKey: 'addresseeId',
  as: 'addressee'
})

// ========================================
// Relaciones de Usuario y Repisas
// ========================================

// Un usuario puede tener muchas repisas
User.hasMany(Shelf, {
  foreignKey: 'userId',
  as: 'shelves',
  onDelete: 'CASCADE'
})

// Cada repisa pertenece a un usuario
Shelf.belongsTo(User, {
  foreignKey: 'userId',
  as: 'owner'
})

// ========================================
// Relaciones de Repisa e Items
// ========================================

// Una repisa puede tener muchos items
Shelf.hasMany(ShelfItem, {
  foreignKey: 'shelfId',
  as: 'items',
  onDelete: 'CASCADE'
})

// Cada item pertenece a una repisa
ShelfItem.belongsTo(Shelf, {
  foreignKey: 'shelfId',
  as: 'shelf'
})

// ========================================
// Relaciones de Posts
// ========================================

// Un usuario puede crear muchos posts
User.hasMany(Post, {
  foreignKey: 'userId',
  as: 'posts',
  onDelete: 'CASCADE'
})

// Cada post pertenece a un usuario
Post.belongsTo(User, {
  foreignKey: 'userId',
  as: 'author'
})

// ========================================
// Relaciones de Comentarios
// ========================================

// Un post puede tener muchos comentarios
Post.hasMany(Comment, {
  foreignKey: 'postId',
  as: 'comments',
  onDelete: 'CASCADE'
})

// Cada comentario pertenece a un post
Comment.belongsTo(Post, {
  foreignKey: 'postId',
  as: 'post'
})

// Un usuario puede hacer muchos comentarios
User.hasMany(Comment, {
  foreignKey: 'userId',
  as: 'userComments',
  onDelete: 'CASCADE'
})

// Cada comentario pertenece a un usuario
Comment.belongsTo(User, {
  foreignKey: 'userId',
  as: 'author'
})

// ========================================
// Relaciones de Likes
// ========================================

// Un post puede tener muchos likes
Post.hasMany(Like, {
  foreignKey: 'postId',
  as: 'likes',
  onDelete: 'CASCADE'
})

// Cada like pertenece a un post
Like.belongsTo(Post, {
  foreignKey: 'postId',
  as: 'post'
})

// Un usuario puede dar muchos likes
User.hasMany(Like, {
  foreignKey: 'userId',
  as: 'userLikes',
  onDelete: 'CASCADE'
})

// Cada like pertenece a un usuario
Like.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
})

// ========================================
// Relaciones de Chat
// ========================================

// Un usuario puede enviar muchos mensajes de chat
User.hasMany(ChatMessage, {
  foreignKey: 'userId',
  as: 'chatMessages',
  onDelete: 'CASCADE'
})

// Cada mensaje de chat pertenece a un usuario
ChatMessage.belongsTo(User, {
  foreignKey: 'userId',
  as: 'author'
})

// ========================================
// Exportar modelos y constantes
// ========================================
module.exports = {
  sequelize,
  User,
  Friendship,
  Shelf,
  ShelfItem,
  Post,
  Comment,
  Like,
  ChatMessage,
  // Constantes utiles
  SHELF_CATEGORIES: Shelf.SHELF_CATEGORIES,
  CATEGORY_INFO: Shelf.CATEGORY_INFO,
  VISIBILITY_OPTIONS: Shelf.VISIBILITY_OPTIONS,
  API_SOURCES: ShelfItem.API_SOURCES,
  POST_TYPES: Post.POST_TYPES
}
