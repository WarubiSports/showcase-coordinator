import { randomBytes } from 'crypto'

// Server only. 18 random bytes = 24 url-safe characters; the token is the only access key to an invite.
export const newInviteToken = (): string => randomBytes(18).toString('base64url')
