(function (root) {
  'use strict';

  /**
   * Optional Shared Public Wall Configuration (Supabase).
   * Paste your free Supabase Project URL and public Anon Key below
   * (after running supabase-public.sql) so EVERY visitor on GitHub Pages
   * sees other users' confessions in real time.
   *
   * Leave blank to run in zero-config Local Storage mode.
   */
  root.CONFESSION_CONFIG = {
    supabaseUrl: '',
    supabaseAnonKey: '',
    aiProxyUrl: '',
  };
})(typeof window !== 'undefined' ? window : globalThis);
