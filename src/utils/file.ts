import fs from 'fs'
import path from 'path'

async function ensurePathExists(directoryPath: string): Promise<void> {
  try {
    await fs.promises.access(directoryPath, fs.constants.F_OK)
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      await fs.promises.mkdir(directoryPath, { recursive: true })
    } else {
      console.error(error)
      throw error
    }
  }
}

async function copyFolderRecursive(source: string, destination: string): Promise<void> {
  await ensurePathExists(destination)

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

export async function readFile(filePath: string): Promise<string> {
  try {
    return await fs.promises.readFile(filePath, 'utf8')
  } catch (error) {
    console.error(error)
    throw error
  }
}

export async function writeFile(content: string, destination: string, overwrite: boolean = false): Promise<void> {
  try {
    const directory = path.dirname(destination)
    await ensurePathExists(directory) // Ensure directory exists

    const fileExists = await fs.promises
      .access(destination)
      .then(() => true)
      .catch(() => false)

    if (!fileExists || overwrite) {
      await fs.promises.writeFile(destination, content)
    } else {
      throw new Error(`File already exists at ${destination}`)
    }
  } catch (error) {
    console.error(error)
    throw error
  }
}
