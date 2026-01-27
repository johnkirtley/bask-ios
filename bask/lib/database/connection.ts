'use client';

import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

const DB_NAME = 'bask';

class DatabaseService {
  private static instance: DatabaseService;
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async initialize(): Promise<void> {
    // Return existing initialization if in progress or completed
    if (this.initPromise) {
      return this.initPromise;
    }

    // Set promise immediately to prevent race conditions
    // Multiple concurrent calls will all await the same promise
    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    // Web fallback: skip SQLite (use localStorage)
    if (!Capacitor.isNativePlatform()) {
      console.warn('SQLite not available on web, using localStorage fallback');
      this.isInitialized = true;
      return;
    }

    try {
      // Check connection consistency (required for iOS)
      const ret = await this.sqlite.checkConnectionsConsistency();
      const isConn = (await this.sqlite.isConnection(DB_NAME, false)).result;

      if (ret.result && isConn) {
        this.db = await this.sqlite.retrieveConnection(DB_NAME, false);
      } else {
        this.db = await this.sqlite.createConnection(
          DB_NAME,
          false,
          'no-encryption',
          1,
          false
        );
      }

      await this.db.open();
      this.isInitialized = true;
    } catch (error) {
      console.error('Database initialization failed:', error);
      this.initPromise = null;
      throw error;
    }
  }

  async getConnection(): Promise<SQLiteDBConnection> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    if (!this.db) {
      throw new Error('Database connection not available (web platform)');
    }
    return this.db;
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.sqlite.closeConnection(DB_NAME, false);
      this.db = null;
      this.isInitialized = false;
      this.initPromise = null;
    }
  }

  isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

export const databaseService = DatabaseService.getInstance();
