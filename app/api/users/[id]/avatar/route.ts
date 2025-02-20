import { NextResponse } from 'next/server'

import { getServerSession } from 'next-auth'
import { join } from 'path'

import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database/prisma'
import { getStorageProvider } from '@/lib/storage'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get the user's current avatar
    const user = await prisma.user.findUnique({
      where: { id },
      select: { image: true },
    })

    if (!user) {
      return new NextResponse('User not found', { status: 404 })
    }

    // Delete if it's a local or S3 avatar (starting with /api/avatars/)
    if (user.image?.startsWith('/api/avatars/')) {
      try {
        const storageProvider = await getStorageProvider()
        // Extract just the filename from the path and construct the avatars path
        const filename = user.image.split('/').pop()
        if (filename) {
          const avatarPath = join('avatars', filename)
          await storageProvider.deleteFile(avatarPath)
        }
      } catch (error) {
        console.error('Error deleting avatar file:', error)
      }
    }

    // Update user to remove avatar
    await prisma.user.update({
      where: { id },
      data: { image: null },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error removing avatar:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
