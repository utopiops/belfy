import fs from 'fs'
import path from 'path'

export async function copyFolderRecursive(source: string, destination: string): Promise<void> {
  try {
    // Create destination folder if it doesn't exist
    await fs.mkdirSync(destination, { recursive: true })
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      throw error
    }
  }
  const entries = await fs.promises.readdir(source)

  for (const entry of entries) {
    const srcPath = path.join(source, entry)
    const destPath = path.join(destination, entry)
    const entryStat = await fs.promises.stat(srcPath)

    if (entryStat.isDirectory()) {
      await fs.promises.mkdir(destPath, { recursive: true })
      await copyFolderRecursive(srcPath, destPath)
    } else {
      await fs.promises.copyFile(srcPath, destPath)
    }
  }
}

export async function copyFolder(source: string, destination: string): Promise<void> {
  try {
    await copyFolderRecursive(source, destination)
    console.log(`Folder copied from ${source} to ${destination} successfully.`)
  } catch (error) {
    console.error('Error copying folder:', error)
  }
}
