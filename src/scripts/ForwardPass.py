import sys, json, torch, os, io
from transformers import AutoTokenizer, AutoModelForCausalLM, AutoConfig
import accelerate
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


def is_allowed_char(char):
    allowed_symbols = "!@#$%^&*()+_-ABCDE}FGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/:|{></?.,"
    return char.isascii() and (char.isalnum() or char in allowed_symbols or char.isspace())

def filter_decoded_token(decoded_token):
    for c in decoded_token:
        if not is_allowed_char(c):
            return None
    return decoded_token

def handle_exception(e):
    error_message = f"An error occurred: {str(e)}"
    sys.stdout.write(error_message + '|||')
    sys.stdout.flush()
    sys.stdout.write('endSignal')
    sys.stdout.flush()


def FP32Generate_CUDA(user_input, context_settings, device):
    model.to(device)
    maxTokens = (int(context_settings['maxTokens']))
    temperature = (float(context_settings['temperature']))
    NoRepeat = (int(context_settings['noRepeatNgramSize']))
    topP = (float(context_settings['topP']))
    topK = (int(context_settings['topK']))
    eos = (str(context_settings['eos']))
    forbidden_tokens = (str(context_settings['bos'])).split()


    input_tokens = tokenizer.encode(user_input, return_tensors='pt').to(device)

    generated_tokens = []
    generated_text = ""

    for _ in range(maxTokens):  
        with torch.no_grad():
            out = model.generate(input_ids=input_tokens.to(device),
                                  max_length=input_tokens.shape[1] + 1,
                                  temperature=temperature,
                                  no_repeat_ngram_size=NoRepeat,
                                  top_k = topK,
                                  top_p = topP,
                                  bad_words_ids=[tokenizer.encode(ft) for ft in forbidden_tokens]
                                )
            next_token = out[:, -1].to(device)  # Ensure `next_token` is on the same device
            generated_tokens.append(next_token.item())
            input_tokens = torch.cat((input_tokens, next_token.unsqueeze(0)), dim=1)
            decoded_token = tokenizer.decode(next_token.item())
            decoded_token = filter_decoded_token(decoded_token)

            if decoded_token is None:
                continue

            generated_text += decoded_token

            if eos in generated_text:
                generated_text=""

                break

            sys.stdout.write(generated_text + '|||')

            sys.stdout.write(decoded_token + '|||')
            sys.stdout.flush()

    sys.stdout.write(decoded_token + 'endSignal')
    sys.stdout.flush()

def FP32Generate_CPU(user_input, context_settings, device):
    model.to('cpu')
    maxTokens = (int(context_settings['maxTokens']))
    temperature = (float(context_settings['temperature']))
    NoRepeat = (int(context_settings['noRepeatNgramSize']))
    topP = (float(context_settings['topP']))
    topK = (int(context_settings['topK']))
    eos = (str(context_settings['eos']))
    forbidden_tokens = (str(context_settings['bos'])).split()



    input_tokens = tokenizer.encode(user_input, return_tensors='pt')
    input_tokens = input_tokens.to('cpu')

    generated_tokens = []
    generated_text = ""

    for _ in range(maxTokens):  
        with torch.no_grad():
            out = model.generate(input_ids=input_tokens.to('cpu'),
                                  max_length=input_tokens.shape[1] + 1,
                                  temperature=temperature,
                                  no_repeat_ngram_size=NoRepeat,
                                  top_k = topK,
                                  top_p = topP,
                                  bad_words_ids=[tokenizer.encode(ft) for ft in forbidden_tokens]
                                )
            next_token = out[:, -1].to('cpu')  # Ensure `next_token` is on the same device
            generated_tokens.append(next_token.item())
            input_tokens = torch.cat((input_tokens, next_token.unsqueeze(0)), dim=1)
            decoded_token = tokenizer.decode(next_token.item())
            decoded_token = filter_decoded_token(decoded_token)

            if decoded_token is None:
                continue

            generated_text += decoded_token

            if eos in generated_text:
                generated_text=""

                break

            sys.stdout.write(generated_text + '|||')

            sys.stdout.write(decoded_token + '|||')
            sys.stdout.flush()

    sys.stdout.write(decoded_token + 'endSignal')
    sys.stdout.flush()

def FP16Generate_CUDA(user_input, context_settings, device):
    model.to(device)
    model.half()
    maxTokens = (int(context_settings['maxTokens']))
    temperature = (float(context_settings['temperature']))
    NoRepeat = (int(context_settings['noRepeatNgramSize']))
    topP = (float(context_settings['topP']))
    topK = (int(context_settings['topK']))
    eos = (str(context_settings['eos']))
    forbidden_tokens = (str(context_settings['bos'])).split()


    input_tokens = tokenizer.encode(user_input, return_tensors='pt').to(device)

    generated_tokens = []
    generated_text = ""

    for _ in range(maxTokens):  
        with torch.no_grad():
            out = model.generate(input_ids=input_tokens,
                                  max_length=input_tokens.shape[1] + 1,
                                  temperature=temperature,
                                  no_repeat_ngram_size=NoRepeat,
                                  top_k = topK,
                                  top_p = topP,
                                  bad_words_ids=[tokenizer.encode(ft) for ft in forbidden_tokens]
                                )
            next_token = out[:, -1]
            generated_tokens.append(next_token.item())
            input_tokens = torch.cat((input_tokens, next_token.unsqueeze(0)), dim=1)
            decoded_token = tokenizer.decode(next_token.item())
            decoded_token = filter_decoded_token(decoded_token)

            if decoded_token is None:
                continue

            generated_text += decoded_token

            if eos in generated_text:
                generated_text=""

                break

            sys.stdout.write(generated_text + '|||')

            sys.stdout.write(decoded_token + '|||')
            sys.stdout.flush()

    sys.stdout.write(decoded_token + 'endSignal')
    sys.stdout.flush()

def INT8GenerateLLAMA_CPU(user_input, context_settings, device):

    num_cores = os.cpu_count()
    num_threads = num_cores - 1 if num_cores > 1 else 1

    maxTokens = (int(context_settings['maxTokens']))
    temperature = (float(context_settings['temperature']))
    NoRepeat = (int(context_settings['noRepeatNgramSize']))
    topP = (float(context_settings['topP']))
    topK = (int(context_settings['topK']))
    eos = (str(context_settings['eos']))
    forbidden_tokens = (str(context_settings['bos'])).split()

    prompt = user_input

    for decoded_token in model.generate(prompt,  
                                    n_threads=num_threads,
                                    n_predict=maxTokens,
                                    repeat_last_n=NoRepeat,
                                    top_k=topK,
                                    top_p=topP,
                                    temp=temperature,):
        decoded_token = filter_decoded_token(decoded_token)
        if decoded_token is None:
            continue
        sys.stdout.write(decoded_token + '|||')
        sys.stdout.flush()

    sys.stdout.write(decoded_token + 'endSignal')
    sys.stdout.flush()


def INT4GenerateLLAMA_CPU(user_input, context_settings, device):

    num_cores = os.cpu_count()
    num_threads = num_cores - 1 if num_cores > 1 else 1

    maxTokens = (int(context_settings['maxTokens']))
    temperature = (float(context_settings['temperature']))
    NoRepeat = (int(context_settings['noRepeatNgramSize']))
    topP = (float(context_settings['topP']))
    topK = (int(context_settings['topK']))
    eos = (str(context_settings['eos']))
    forbidden_tokens = (str(context_settings['bos'])).split()

    prompt = user_input

    for decoded_token in model.generate(prompt,  
                                    n_threads=num_threads,
                                    n_predict=maxTokens,
                                    repeat_last_n=NoRepeat,
                                    top_k=topK,
                                    top_p=topP,
                                    temp=temperature,):
        decoded_token = filter_decoded_token(decoded_token)
        if decoded_token is None:
            continue
        sys.stdout.write(decoded_token + '|||')
        sys.stdout.flush()

    sys.stdout.write(decoded_token + 'endSignal')
    sys.stdout.flush()







# Read modelSettings.json
model_settings_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', './data/modelSettings.json')
with open(model_settings_path, 'r') as f:
    model_settings = json.load(f)

# Update model_insignia with the value of the "modelRepository" field
model_insignia = model_settings['modelRepository']
model_path = model_settings['modelPath']
model_config = model_settings['modelConfig']

try:
    if model_config != "":
        tokenizer_path = os.path.join(os.path.dirname(os.path.abspath(model_config)))
        tokenizer = AutoTokenizer.from_pretrained(tokenizer_path)
    elif model_path != "":
        tokenizer_path = os.path.join(os.path.dirname(os.path.abspath(model_path)))
        tokenizer = AutoTokenizer.from_pretrained(tokenizer_path)
    else:
        tokenizer = AutoTokenizer.from_pretrained(model_insignia, cache_dir = '../models')

except Exception as e:
    tokenizer = AutoTokenizer.from_pretrained(model_insignia)

if (model_config) and (model_path):
    config = AutoConfig.from_pretrained(model_config)
    model = AutoModelForCausalLM.from_pretrained(model_path, config=config)
    model_architecture = config.architectures
elif (model_path) and ".ggml" in model_path:
    from pyllamacpp.model import Model
    ggml_path = model_path # @param {type: "string"}
    model = Model(model_path=model_path, n_ctx=1000)
else:
    config = AutoConfig.from_pretrained(model_insignia, cache_dir = '../models')
    model = AutoModelForCausalLM.from_pretrained(model_insignia, config=config, cache_dir = '../models')





    

while True:
    try:
        input_line = sys.stdin.readline()
        if not input_line:
            break

        input_data = json.loads(input_line.strip())

        preprocessed_input = input_data['user_input']

        user_input = preprocessed_input.replace('\n', ' ')

        context_settings = input_data['context_settings']

        bitswitch = model_settings['bitSwitch']

        device = model_settings['hardwareSwitch']

        


        if bitswitch == 3 and device == 'cuda':
            FP32Generate_CUDA(user_input, context_settings, device)
        elif bitswitch == 3 and device == 'cpu':
            FP32Generate_CPU(user_input, context_settings, device)
        elif bitswitch == 2 and device == 'cuda':
            FP16Generate_CUDA(user_input, context_settings, device)
        elif bitswitch == 1 and device == 'cpu':
            INT8GenerateLLAMA_CPU(user_input, context_settings, device)
        elif bitswitch == 0 and device == 'cpu':
            INT4GenerateLLAMA_CPU(user_input, context_settings, device)
        else:
            sys.stdout.write('Error 309. Invalid. ' + '|||')
            sys.stdout.flush()
            sys.stdout.write('endSignal')
            sys.stdout.flush()

    except Exception as e:
        handle_exception(e)










