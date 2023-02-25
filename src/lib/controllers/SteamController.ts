import { sleep } from "decky-frontend-lib";
import { PyInterop } from "../../PyInterop";
// import { waitForCondition } from "./Utils";

/**
 * Wrapper class for the SteamClient interface.
 */
export class SteamController {
  private hasLoggedIn = false;
  private hasLoggedOut = false;

  /**
   * Gets a list of non steam game appIds.
   * @returns A list of non steam game appIds.
   */
  getNonSteamAppIds() {
    return Array.from(collectionStore.deckDesktopApps.apps.keys());
  }

  /**
   * Gets a list of the current user's steam shortcuts.
   * @returns A promise resolving to list of the current user's steam shortcuts.
   */
  async getShortcuts(): Promise<SteamAppDetails[]> {
    const appIds = this.getNonSteamAppIds();
    const res = await Promise.all(appIds.map((appId:number)=> this.getAppDetails(appId)));
  
    
    PyInterop.log(`Got shortcuts. [DEBUG INFO] resultsLength: ${res.length};`);

    return res as SteamAppDetails[];
  }

  /**
   * Gets a list of the current user's steam shortcuts with a given name.
   * @param appName The name of the shortcut to look for.
   * @returns A promise resolving to list of the current user's steam shortcuts.
   */
  async getShortcut(appName: string): Promise<SteamAppDetails[] | undefined> {
    const shortcutsList = await this.getShortcuts();
    const res = shortcutsList.filter((s: SteamAppDetails) => s.strDisplayName == appName);

    PyInterop.log(`Got shortcuts with desired name. [DEBUG INFO] appName: ${appName}; resultsLength: ${res.length};`);
    return res;
  }

  /**
   * Gets a list of the current user's steam shortcuts with a given id.
   * @param appId The id of the shortcut to look for.
   * @returns A promise resolving to list of the current user's steam shortcuts.
   */
  async getShortcutById(appId: number): Promise<SteamAppDetails[] | undefined> {
    const shortcutsList = await this.getShortcuts();
    const res = shortcutsList.filter((s: SteamAppDetails) => s.unAppID == appId);

    PyInterop.log(`Got shortcuts with desired name. [DEBUG INFO] appId: ${appId}; resultsLength: ${res.length};`);
    return res;
  }

  /**
   * Gets the SteamAppOverview of the app with a given appId.
   * @param appId The id of the app to get.
   * @returns A promise resolving to the SteamAppOverview of the app
   */
  async getAppOverview(appId: number) {
    const { appStore } = (window as any);
    return appStore.GetAppOverviewByAppID(appId) as SteamAppOverview | null;
  }

  /**
   * Gets the SteamAppDetails of the app with a given appId.
   * @param appId The id of the app to get.
   * @returns A promise resolving to the SteamAppDetails of the app
   */
  async getAppDetails(appId: number): Promise<SteamAppDetails | null> {
    // await this.waitForAppDetails(appId, (details) => details !== null);
    // return await this._getAppDetails(appId);
    return new Promise((resolve) => {
      console.log(appId);
      try {
        const { unregister } = SteamClient.Apps.RegisterForAppDetails(appId, (details: SteamAppDetails) => {
          unregister();
          resolve(details.unAppID === undefined ? null : details);
        });
      } catch (e:any) {
        PyInterop.log(`Error encountered trying to get app details. Error: ${e.message}`);
      }
    });
  }

  // private async _getAppDetails(appId: number): Promise<SteamAppDetails | null> {
  //   return new Promise((resolve) => {
  //     console.log(appId);
  //     try {
  //       const { unregister } = SteamClient.Apps.RegisterForAppDetails(appId, (details: SteamAppDetails) => {
  //         unregister();
  //         resolve(details.unAppID === undefined ? null : details);
  //       });
  //     } catch (e:any) {
  //       PyInterop.log(`Error encountered trying to get app details. Error: ${e.message}`);
  //     }
  //   });
  // }

  // private async waitForAppDetails(appId: number, condition: (details:SteamAppDetails|null) => boolean): Promise<boolean> {
  //   return await waitForCondition(3, 250, async () => {
  //     const details = await this._getAppDetails(appId);
  //     return condition(details);
  //   });
  // }

  /**
   * Hides a steam app.
   * @param appId The id of the app to hide.
   * @returns A promise resolving to true if the app was successfully hidden.
   */
  async hideApp(appId: number): Promise<boolean> {
    const { collectionStore } = (window as any);
    if (collectionStore.BIsHidden(appId)) {
      PyInterop.log(`Successfully hid app (1 try). [DEBUG INFO] appId: ${appId};`);
      return true;
    }

    collectionStore.SetAppsAsHidden([appId], true);

    let retries = 4;
    while (retries--) {
      if (collectionStore.BIsHidden(appId)) {
        PyInterop.log(`Successfully hid app (${ 4 - retries + 1} tries). [DEBUG INFO] appId: ${appId};`);
        return true;
      }
      if (retries > 0) {
        await sleep(250);
      }
    }

    PyInterop.log(`Could not hide app (ran out of retries). [DEBUG INFO] appId: ${appId};`);
    return false;
  }

  /**
   * Creates a new shortcut.
   * @param appName The name of the new shortcut.
   * @param execPath The exe path of the new shortcut.
   * @returns A promise resolving to the new shortcut's appId if the shortcut was successfully created.
   */
  async addShortcut(appName: string, execPath: string): Promise<number | null> {
    const appId = await SteamClient.Apps.AddShortcut(appName, execPath) as number | undefined | null;
    if (typeof appId === "number") {
      const overview = await this.getAppOverview(appId);
      if (overview && overview.display_name == appName) {
        return appId;
      }

      // necessary cleanup to avoid duplicates, which is very BAD (Steam goes bonkers)
      await this.removeShortcut(appId as number);
      PyInterop.log(`Removing shortcut. [DEBUG INFO] appId: ${appId}; appName: ${appName};`);
    }

    PyInterop.log(`Could not add shortcut. [DEBUG INFO] appId: ${appId}; appName: ${appName};`);

    return null;
  }

  /**
   * Sets the exe of a steam shortcut.
   * @param appId The id of the shortcut to set.
   * @param exePath The path of the exe.
   * @returns A promise resolving to true if the exe was successfully set.
   */
  async setShortcutExe(appId: number, exePath: string): Promise<boolean> {
    const details = await this.getAppDetails(appId);
    if (!details) {
      PyInterop.log(`Could not set exe path (does not exist)! [DEBUG INFO] appId: ${appId};`);
      return false;
    }

    if (details.strShortcutExe == `\"${exePath}\"` || details.strShortcutExe == exePath) {
      PyInterop.log(`Set shortcut exe path. [DEBUG INFO] strDisplayName: ${details.strDisplayName}; appId:${appId};`);
      return true;
    }

    SteamClient.Apps.SetShortcutExe(appId, exePath);
    const updated = await this.getAppDetails(appId);
    if (updated?.strShortcutExe == `\"${exePath}\"` || updated?.strShortcutExe == exePath) {
      PyInterop.log(`Could not exe path. [DEBUG INFO] strDisplayName: ${details.strDisplayName}; appId: ${appId};`);
      return false;
    }
    return true;
  }

  /**
   * Sets the start directory of a steam shortcut.
   * @param appId The id of the shortcut to set.
   * @param startDir The start directory of the shortcut.
   * @returns A promise resolving to true if the start dir was successfully set.
   */
  async setShortcutStartDir(appId: number, startDir: string): Promise<boolean> {
    const details = await this.getAppDetails(appId);
    if (!details) {
      PyInterop.log(`Could not start dir (does not exist). [DEBUG INFO] appId: ${appId};`);
      return false;
    }

    if (details.strShortcutStartDir == `\"${startDir}\"` || details.strShortcutStartDir == startDir) {
      PyInterop.log(`Set start dir. [DEBUG INFO] appId: ${appId};`);
      return true;
    }

    SteamClient.Apps.SetShortcutStartDir(appId, startDir);
    const updated = await this.getAppDetails(appId);
    if (updated?.strShortcutStartDir == `\"${startDir}\"` || updated?.strShortcutStartDir == startDir) {
      PyInterop.log(`Could not start dir. [DEBUG INFO] appId: ${appId};`);
      return false;
    }
    return true;
  }

  /**
   * Sets the options of a steam app.
   * @param appId The id of the app to set.
   * @param options The options to use.
   * @returns A promise resolving to true if the options were successfully set.
   */
  async setAppLaunchOptions(appId: number, options: string): Promise<boolean> {
    const details = await this.getAppDetails(appId);
    if (!details) {
      PyInterop.log(`Could not add launch options (does not exist). [DEBUG INFO] appId: ${appId};`);
      return false;
    }

    if (details.strLaunchOptions === options) {
      PyInterop.log(`Removed shortcut. [DEBUG INFO] appId: ${appId};`);
      return true;
    }

    SteamClient.Apps.SetAppLaunchOptions(appId, options);
    const updated = await this.getAppDetails(appId);
    if (updated?.strLaunchOptions === options) {
      PyInterop.log(`Could not add launch options. [DEBUG INFO] appId: ${appId};`);
      return false;
    }
    return true;
  }

  /**
   * Removes a steam shortcut.
   * @param appId The id of the shortcut to remove.
   * @returns A promise resolving to true if the shortcut was successfully removed.
   */
  async removeShortcut(appId: number): Promise<boolean> {
    const overview = await this.getAppOverview(appId);
    if (!overview) {
      PyInterop.log(`Could not remove shortcut (does not exist). [DEBUG INFO] appId: ${appId};`);
      return true;
    }

    const { collectionStore } = (window as any);
    const collections = collectionStore.userCollections;

    SteamClient.Apps.RemoveShortcut(appId);
    for (const collection of collections) {
      if (collection.bAllowsDragAndDrop && collection.apps.has(appId)) {
        PyInterop.log(`Removed shortcut from collection. [DEBUG INFO] appId: ${appId}; collection: ${collection};`);
        collection.AsDragDropCollection().RemoveApps([overview]);
      }
    }

    const updated = await this.getAppOverview(appId);
    if (updated != null) {
      PyInterop.log(`Could not remove shortcut. [DEBUG INFO] appId: ${appId};`);
      return false;
    }

    return true;
  }

  /**
   * Gets the gameId associated with an app.
   * @param appId The id of the game.
   * @returns A promise resolving to the gameId.
   */
  async getGameId(appId: number): Promise<string | null> {
    const overview = await this.getAppOverview(appId);
    if (!overview) {
      PyInterop.log(`Could not get game id. [DEBUG INFO] appId: ${appId};`);
      return null;
    }

    return overview.gameid;
  }

  /**
   * Registers for lifecycle updates for a steam app.
   * @param appId The id of the app to register for.
   * @param callback The callback to run when an update is recieved.
   * @returns A function to call to unregister the hook.
   */
  registerForGameLifetime(appId: number, callback: (data: LifetimeNotification) => void) {
    const { unregister } = SteamClient.GameSessions.RegisterForAppLifetimeNotifications((data: LifetimeNotification) => {
      if (data.unAppID !== appId) return;

      callback(data);
    });
    return unregister as () => void;
  }

  /**
   * Waits for a game lifetime event to occur.
   * @param appId The id of the app to wait for.
   * @param options The options to determine when the function returns true.
   * @returns A promise resolving to true when the desired lifetime event occurs.
   */
  async waitForGameLifetime(appId: number, options: { initialTimeout?: number, waitForStart?: boolean, waitUntilNewEnd?: boolean } = {}): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      let timeoutId: any = null;
      let startAwaited: boolean = false;
      const unregister = this.registerForGameLifetime(appId, (data: LifetimeNotification) => {
        if (!startAwaited) {
          startAwaited = data.bRunning;
        }

        if (options.waitForStart && !startAwaited) {
          return;
        }

        if (timeoutId !== null) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        if (options.waitUntilNewEnd) {
          if (!startAwaited || data.bRunning) {
            return;
          }
        }

        unregister();
        PyInterop.log(`Game lifetime subscription ended, game closed. [DEBUG INFO] appId: ${appId};`);
        resolve(true);
      });

      if (options.initialTimeout) {
        timeoutId = setTimeout(() => {
          PyInterop.log(`Game lifetime subscription expired. [DEBUG INFO] appId: ${appId};`);
          unregister();
          resolve(false);
        }, options.initialTimeout);
      }
    });
  }

  /**
   * Runs a steam app.
   * @param appId The id of the app to run.
   * @returns A promise resolving once the app has been run or the request times out.
   */
  async runGame(appId: number, waitUntilGameStops: boolean): Promise<boolean> {
    const gameStart = this.waitForGameLifetime(appId, { initialTimeout: 1500, waitForStart: true, waitUntilNewEnd: waitUntilGameStops });
    const gameId = await this.getGameId(appId);
    SteamClient.Apps.RunGame(gameId, "", -1, 100);

    PyInterop.log(`Running app/game. [DEBUG INFO] appId: ${appId}; gameId: ${gameId};`);

    return await gameStart;
  }

  /**
   * Terminates a steam app.
   * @param appId The id of the app to terminate.
   * @returns A promise resolving once the app has been terminated or the request times out.
   */
  async terminateGame(appId: number): Promise<boolean> {
    const gameEnd = this.waitForGameLifetime(appId, { initialTimeout: 1500, waitForStart: false, waitUntilNewEnd: true });
    const gameId = await this.getGameId(appId);
    SteamClient.Apps.TerminateApp(gameId, false);
    
    PyInterop.log(`Terminating app/game. [DEBUG INFO] appId: ${appId}; gameId: ${gameId};`);

    return await gameEnd;
  }

  /**
   * Registers a hook for when the user's login state changes.
   * @param onLogin Function to run on login.
   * @param onLogout Function to run on logout.
   * @param once Whether the hook should run once.
   * @returns A function to unregister the hook.
   */
  registerForAuthStateChange(onLogin: ((username?:string) => Promise<void>) | null, onLogout: (() => Promise<void>) | null, once: boolean): { unregister: () => void } {
    try {
      let isLoggedIn: boolean | null = null;
      return SteamClient.User.RegisterForLoginStateChange((username: string) => {
        if (username === "") {
          if (isLoggedIn !== false && (once ? !this.hasLoggedOut : true)) {
            if (onLogout) onLogout();
            PyInterop.log("User logged out.");
          }
          isLoggedIn = false;
        } else {
          if (isLoggedIn !== true && (once ? !this.hasLoggedIn : true)) {
            if (onLogin) onLogin(username);
            PyInterop.log(`user logged in. [DEBUG INFO] username: ${username};`);
          }
          isLoggedIn = true;
        }
      });
    } catch (error) {
      PyInterop.log(`error with AuthStateChange hook. [DEBUG INFO] error: ${error};`);
      // @ts-ignore
      return () => { };
    }
  }

  /**
   * Restarts the Steam client.
   */
  restartClient() {
    SteamClient.User.StartRestart();
  }
}