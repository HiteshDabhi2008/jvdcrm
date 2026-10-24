const nunjucks = require('nunjucks');
const fs = require('fs');

function WithExtension() {
  this.tags = ['with'];

  this.parse = function(parser, nodes, lexer) {
    const tok = parser.nextToken();
    const args = parser.parseSignature(null, true);
    parser.advanceAfterBlockEnd(tok.value);

    const body = parser.parseUntilBlocks('endwith');
    parser.advanceAfterBlockEnd();

    return new nodes.CallExtension(this, 'run', args, [body]);
  };

  this.run = function(context, ...args) {
    const body = args.pop();
    const kwargs = args[args.length - 1];
    const ctx = context.ctx;
    const oldValues = {};
    if (kwargs && typeof kwargs === 'object') {
      for (const [k, v] of Object.entries(kwargs)) {
        oldValues[k] = ctx[k];
        ctx[k] = v;
      }
    }
    const res = body();
    if (kwargs && typeof kwargs === 'object') {
      for (const k of Object.keys(kwargs)) {
        if (oldValues[k] !== undefined) {
          ctx[k] = oldValues[k];
        } else {
          delete ctx[k];
        }
      }
    }
    return new nunjucks.runtime.SafeString(res);
  };
}

const env = nunjucks.configure('.', { express: null, autoescape: true });
env.addExtension('WithExtension', new WithExtension());

const urlFor = function(name, kwargs) {
  if (name === 'static') return '/static/' + (kwargs ? kwargs.filename : '');
  if (name === 'print_case' && kwargs && kwargs.reg_no) return '/print/' + kwargs.reg_no;
  if (name === 'success' && kwargs && kwargs.reg_no) return '/success/' + kwargs.reg_no;
  const routes = {
    'home': '/',
    'login': '/login',
    'register': '/register',
    'dashboard': '/dashboard',
    'entry': '/entry',
    'view_records': '/view',
    'entry_save': '/entry/save',
    'entry_update': '/entry/update',
    'entry_lookup': '/entry/lookup',
    'api_cases': '/api/cases',
    'logout': '/logout',
    'google.login': '/auth/google'
  };
  return routes[name] || '#';
};
urlFor.__doc__ = 'Flask url_for function google.login';
env.addGlobal('url_for', urlFor);

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
const context = {
  current_user: { role: 'head', full_name: 'Test Head Admin' },
  get_flashed_messages: (opts) => opts && opts.with_categories ? [['success', 'Welcome']] : ['Welcome'],
  case: {
    reg_no: 'JVD.2026.0001',
    caller_name: 'John Doe',
    contact_no: '9876543210',
    village: 'Village A',
    city: 'City B',
    district: 'District C',
    state: 'Gujarat',
    animal_type: 'Domestic',
    species: 'Dog',
    sex: 'Male',
    cause: 'Accident',
    discrimination: '',
    treatment: 'Bandage and antibiotics',
    contribution: 'None',
    status: 'Under Treatment',
    post_time: '2026-10-03 08:30:00',
    last_edited_by: 'Test Head Admin',
    last_edited_at: '2026-10-03 08:30:00'
  },
  reg_no: 'JVD.2026.0001',
  address: 'Village A, City B, District C, Gujarat'
};

console.log('Testing template rendering:');
for (const file of files) {
  try {
    env.render(file, context);
    console.log(`[PASS] ${file}`);
  } catch (err) {
    console.error(`[FAIL] ${file}: ${err.message}`);
  }
}
