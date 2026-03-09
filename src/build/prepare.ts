import { resolve } from "path"
import { mkdir } from "fs"
import {
    initAutoImports,
    generateTypeDeclarations,
    generateTsConfig,
} from "./auto-imports"
import { generateRoutesModule } from "./routes"

/**
 * Prepare the project by generating type declarations and configuration
 */
export async function prepareProject(): Promise<void> {
    const vtermDir = resolve(process.cwd(), ".vterm")

    console.log("Initializing auto-imports...")
    await initAutoImports()

    console.log("Creating .vterm directory...")
    await new Promise<void>((resolvePromise, reject) => {
        mkdir(vtermDir, { recursive: true }, err => {
            if (err) reject(err)
            else resolvePromise()
        })
    })

    console.log("Generating type declarations...")
    const declarations = await generateTypeDeclarations()
    const declarationsPath = resolve(vtermDir, "auto-imports.d.ts")
    await Bun.write(declarationsPath, declarations)

    console.log("Generating TypeScript configuration...")
    const tsconfig = generateTsConfig()
    const tsconfigPath = resolve(vtermDir, "tsconfig.json")
    await Bun.write(tsconfigPath, tsconfig)

    console.log("Generating routes module...")
    try {
        const routesModule = await generateRoutesModule()
        const routesPath = resolve(vtermDir, "routes.ts")
        await Bun.write(routesPath, routesModule)
    } catch (error) {
        console.log("No app/pages directory found, skipping routes generation")
    }

    console.log("✓ Project prepared successfully!")
}
