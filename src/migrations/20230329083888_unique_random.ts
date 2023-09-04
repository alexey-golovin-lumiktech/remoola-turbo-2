import { Knex } from 'knex'

export const fns = { genRandomBytes: `gen_random_bytes`, randomString: `random_string`, uniqueRandom: `unique_random` } as const

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    create function gen_random_bytes(int) returns bytea as '$libdir/pgcrypto', 'pg_random_bytes' language c strict;
    
    create function random_string(len int) returns text as $$
    declare
      chars text[] = '{0,1,2,3,4,5,6,7,8,9,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z}';
      result text = '';
      i int = 0;
      rand bytea;
    begin
      -- generate secure random bytes and convert them to a string of chars.
      rand = gen_random_bytes($1);
      for i in 0..len-1 loop
        -- rand indexing is zero-based, chars is 1-based.
        result =  result || chars[1 + (get_byte(rand, i) % array_length(chars, 1))];
      end loop;
      return result;
    end;
    $$ language plpgsql;
  `)

  await knex.raw(`
    create function unique_random(len int, _table text, _col text) returns text as $$
    declare
      result text;
      numrows int;
    begin
      result = random_string(len);
      loop
        execute format('select 1 from %I where %I = %L', _table, _col, result);
        get diagnostics numrows = row_count;
        if numrows = 0 then
          return result; 
        end if;
        result = random_string(len);
      end loop;
    end;
    $$ language plpgsql;
  `)
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP FUNCTION IF EXISTS unique_random`)
  await knex.raw(`DROP FUNCTION IF EXISTS random_string`)
  await knex.raw(`DROP FUNCTION IF EXISTS gen_random_bytes`)
}
