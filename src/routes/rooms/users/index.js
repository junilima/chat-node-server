import { Router } from 'express'
import HttpStatus from 'http-status-codes'
import { roomsDB, usersDB } from '../../../db'
import { getItem } from '../../../db/helpers'
import { checkPassword, checkRoomUser, isFull } from '../helpers'
import { sendError } from '../../../utils/errorHandler'
import { map, includes } from 'lodash'

const users = Router({ mergeParams: true })

users.post('/', async (req, res) => {
  const { roomId } = req.params
  const { userName } = req.body
  const { password } = req.headers

  const room = await getItem(roomsDB, roomId, res)
  if (!room) return

  if (!checkPassword(room, password, res)) return

  if (isFull(room, res)) return

  usersDB
    .insert({ userName, roomId })
    .then((user) => {
      room.users = room.users || []
      room.users.push(user)
      res.status(200).json(user)
    })
    .catch((error) => sendError(res, error))
})

users.put('/:userId', async (req, res) => {
  const { roomId, userId } = req.params
  const { userId: uId, userName } = req.body
  const { password } = req.headers

  if (userId !== uId || !userName)
    return res
      .status(HttpStatus.BAD_REQUEST)
      .json({ error: { message: 'Params mismatch' } })

  const room = await getItem(roomsDB, roomId, res)
  if (!room) return

  if (!checkPassword(room, password, res)) return

  if (!checkRoomUser(room, userId, res)) return

  let user = await getItem(usersDB, userId, res)

  if (!user) return

  usersDB
    .update({ userName, userId })
    .then((newUser) => {
      delete room.users[user]
      user = { ...user, ...newUser }
      room.users.push(user)
      res.status(200).json(newUser)
    })
    .catch((error) => sendError(res, error))
})

users.get('/', async (req, res) => {
  const { roomId } = req.params
  const { password } = req.headers
  const { offset, limit } = req.query

  const room = await getItem(roomsDB, roomId, res)
  if (!room) return

  if (!checkPassword(room, password, res)) return

  const ids = map(room.users, 'userId')

  usersDB
    .getAll({
      offset: +offset || 0,
      limit: +limit || 0,
      filter: (user) => includes(ids, user.userId),
    })
    .then((userList) => res.status(HttpStatus.OK).json(userList))
    .catch((error) => sendError(res, error))
})

export default users
