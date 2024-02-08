import fs from 'fs'
import path from 'path'
import { copyFolder } from './file'

async function directoryExists(dirPath: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    fs.stat(dirPath, (err, stats) => {
      if (err) {
        if (err.code === 'ENOENT') {
          resolve(false)
        } else {
          resolve(false)
        }
      } else {
        resolve(stats.isDirectory())
      }
    })
  })
}

describe('copyFolder utility function', () => {
  const sourcePath = './testData/sourceFolder'
  const destinationPath = './testData/destinationFolder'

  beforeAll(async () => {
    // Create test folders for source and destination
    await fs.promises.mkdir(sourcePath, { recursive: true })
    await fs.promises.mkdir(destinationPath, { recursive: true })

    // Create some test files in the source folder
    await fs.promises.writeFile(path.join(sourcePath, 'file1.txt'), 'Test file 1')
    await fs.promises.writeFile(path.join(sourcePath, 'file2.txt'), 'Test file 2')
  })

  afterAll(async () => {
    // Clean up test folders
    await fs.promises.rmdir(sourcePath, { recursive: true })
    await fs.promises.rmdir(destinationPath, { recursive: true })
  })

  it('should copy folder contents from source to destination', async () => {
    await copyFolder(sourcePath, destinationPath)

    // Check if files were copied
    const sourceFiles = await fs.promises.readdir(sourcePath)
    const destinationFiles = await fs.promises.readdir(destinationPath)

    expect(sourceFiles).toEqual(destinationFiles)
  })

  it('should create destination folder if it does not exist', async () => {
    const newDestinationPath = './testData/newDestinationFolder'
    await copyFolder(sourcePath, newDestinationPath)

    const destinationExists = await directoryExists(newDestinationPath)
    expect(destinationExists).toBe(true)

    // Clean up created folder
    await fs.promises.rmdir(newDestinationPath, { recursive: true })
  })
})
