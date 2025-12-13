// Modelo de Amistad entre usuarios
const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const Friendship = sequelize.define('Friendship', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  requesterId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'requester_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  addresseeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'addressee_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'blocked'),
    allowNull: false,
    defaultValue: 'pending',
    validate: {
      isIn: {
        args: [['pending', 'accepted', 'blocked']],
        msg: 'Estado de amistad no valido'
      }
    }
  }
}, {
  tableName: 'friendships',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    // Indice unico para evitar duplicados de solicitudes
    {
      unique: true,
      fields: ['requester_id', 'addressee_id']
    },
    // Indices para busquedas frecuentes
    {
      fields: ['requester_id', 'status']
    },
    {
      fields: ['addressee_id', 'status']
    }
  ]
})

// Metodos estaticos para gestionar amistades

// Verificar si existe una relacion entre dos usuarios
Friendship.findRelation = async function(userId1, userId2) {
  return await this.findOne({
    where: {
      [sequelize.Sequelize.Op.or]: [
        { requesterId: userId1, addresseeId: userId2 },
        { requesterId: userId2, addresseeId: userId1 }
      ]
    }
  })
}

// Verificar si dos usuarios son amigos
Friendship.areFriends = async function(userId1, userId2) {
  const relation = await this.findRelation(userId1, userId2)
  return relation && relation.status === 'accepted'
}

// Verificar si un usuario esta bloqueado por otro
Friendship.isBlocked = async function(blockerId, blockedId) {
  const relation = await this.findOne({
    where: {
      requesterId: blockerId,
      addresseeId: blockedId,
      status: 'blocked'
    }
  })
  return !!relation
}

// Obtener el estado de la relacion entre dos usuarios
Friendship.getRelationStatus = async function(userId1, userId2) {
  const relation = await this.findRelation(userId1, userId2)
  if (!relation) return { status: 'none', isRequester: false, relation: null }

  return {
    status: relation.status,
    isRequester: relation.requesterId === userId1,
    relation
  }
}

// Obtener IDs de amigos de un usuario
Friendship.getFriendIds = async function(userId) {
  const friendships = await this.findAll({
    where: {
      status: 'accepted',
      [sequelize.Sequelize.Op.or]: [
        { requesterId: userId },
        { addresseeId: userId }
      ]
    },
    attributes: ['requesterId', 'addresseeId']
  })

  return friendships.map(f =>
    f.requesterId === userId ? f.addresseeId : f.requesterId
  )
}

// Contar amigos de un usuario
Friendship.countFriends = async function(userId) {
  return await this.count({
    where: {
      status: 'accepted',
      [sequelize.Sequelize.Op.or]: [
        { requesterId: userId },
        { addresseeId: userId }
      ]
    }
  })
}

// Contar solicitudes pendientes recibidas
Friendship.countPendingRequests = async function(userId) {
  return await this.count({
    where: {
      addresseeId: userId,
      status: 'pending'
    }
  })
}

// Obtener IDs de usuarios bloqueados por un usuario
Friendship.getBlockedByUserIds = async function(userId) {
  const blocks = await this.findAll({
    where: {
      requesterId: userId,
      status: 'blocked'
    },
    attributes: ['addresseeId']
  })
  return blocks.map(b => b.addresseeId)
}

// Obtener IDs de usuarios que han bloqueado a un usuario
Friendship.getBlockedUserIds = async function(userId) {
  const blocks = await this.findAll({
    where: {
      addresseeId: userId,
      status: 'blocked'
    },
    attributes: ['requesterId']
  })
  return blocks.map(b => b.requesterId)
}

// Obtener todos los IDs de usuarios relacionados con bloqueos (ambas direcciones)
Friendship.getAllBlockedIds = async function(userId) {
  const blocks = await this.findAll({
    where: {
      status: 'blocked',
      [sequelize.Sequelize.Op.or]: [
        { requesterId: userId },
        { addresseeId: userId }
      ]
    },
    attributes: ['requesterId', 'addresseeId']
  })

  const blockedIds = new Set()
  blocks.forEach(b => {
    if (b.requesterId === userId) {
      blockedIds.add(b.addresseeId)
    } else {
      blockedIds.add(b.requesterId)
    }
  })

  return Array.from(blockedIds)
}

module.exports = Friendship
